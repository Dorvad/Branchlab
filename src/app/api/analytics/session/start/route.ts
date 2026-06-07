// POST /api/analytics/session/start
//
// Server-side write so we can validate the payload and resolve the canonical
// scenario_id from the published version ourselves — the client only ever
// supplies sessionId/scenarioVersionId/slug, never scenario ownership.

import { getSupabaseServer } from '@/lib/supabase/server'
import { parseSessionStart } from '@/lib/analytics/validate'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const payload = parseSessionStart(body)
  if (!payload) return Response.json({ error: 'Invalid payload' }, { status: 400 })

  // Preview sessions are never persisted — there is no published version row
  // to attach them to, and previews must not pollute creator analytics.
  if (payload.isPreview) return Response.json({ ok: true, skipped: true })

  const sb = getSupabaseServer()

  // Resolve the canonical scenario_id from the published snapshot — proves the
  // slug/version pair is real and prevents writes against arbitrary IDs.
  const { data: version, error: versionError } = await sb
    .from('scenario_versions')
    .select('id, scenario_id, slug')
    .eq('id', payload.scenarioVersionId)
    .eq('slug', payload.slug)
    .maybeSingle()

  if (versionError || !version) {
    return Response.json({ error: 'Unknown scenario version' }, { status: 404 })
  }

  const row = version as { id: string; scenario_id: string; slug: string }

  const { error } = await sb.from('player_sessions').insert({
    id: payload.sessionId,
    scenario_version_id: row.id,
    scenario_id: row.scenario_id,
    slug: row.slug,
    visitor_id: payload.visitorId ?? null,
    is_preview: false,
    user_agent: request.headers.get('user-agent')?.slice(0, 512) ?? null,
    referrer: request.headers.get('referer')?.slice(0, 512) ?? null,
  })

  if (error) return Response.json({ error: 'Failed to record session' }, { status: 500 })
  return Response.json({ ok: true })
}
