// POST /api/analytics/session/complete
//
// Marks a session as finished and stamps its outcome (ending, score, duration)
// directly on the player_sessions row so the analytics summary can be computed
// without re-walking every event on each page load.

import { getSupabaseServer } from '@/lib/supabase/server'
import { parseSessionComplete } from '@/lib/analytics/validate'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const payload = parseSessionComplete(body)
  if (!payload) return Response.json({ error: 'Invalid payload' }, { status: 400 })

  const sb = getSupabaseServer()

  const { data: session, error: sessionError } = await sb
    .from('player_sessions')
    .select('id, is_preview')
    .eq('id', payload.sessionId)
    .eq('scenario_version_id', payload.scenarioVersionId)
    .maybeSingle()

  if (sessionError || !session) {
    return Response.json({ error: 'Unknown session' }, { status: 404 })
  }

  const row = session as { id: string; is_preview: boolean }
  if (row.is_preview) return Response.json({ ok: true, skipped: true })

  const now = new Date().toISOString()

  const { error } = await sb
    .from('player_sessions')
    .update({
      completed_at: now,
      last_event_at: now,
      ending_node_id: payload.endingNodeId ?? null,
      total_score: payload.totalScore ?? 0,
      duration_seconds: payload.durationSeconds ?? null,
    })
    .eq('id', row.id)

  if (error) return Response.json({ error: 'Failed to complete session' }, { status: 500 })
  return Response.json({ ok: true })
}
