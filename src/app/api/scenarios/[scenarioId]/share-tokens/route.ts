// GET  /api/scenarios/[scenarioId]/share-tokens — list tokens for the latest published version
// POST /api/scenarios/[scenarioId]/share-tokens — mint a new revocable share link
//
// Owner-only via the same per-request authenticated-client + RLS pattern as
// share-settings. Tokens are generated server-side with crypto.randomBytes —
// never accept a client-supplied token value.

import { authenticateRequest, requireOwnedScenario, generateShareToken, parseShareTokenCreate, rowToShareToken } from '@/lib/sharing'

async function loadLatestVersion(auth: Awaited<ReturnType<typeof authenticateRequest>>, scenarioId: string) {
  if (!auth) return null
  const { data } = await auth.sb
    .from('scenario_versions')
    .select('id, scenario_id')
    .eq('scenario_id', scenarioId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as { id: string; scenario_id: string } | null
}

export async function GET(request: Request, { params }: { params: Promise<{ scenarioId: string }> }) {
  const { scenarioId } = await params
  const auth = await authenticateRequest(request)
  if (!auth) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const scenario = await requireOwnedScenario(auth, scenarioId)
  if (!scenario) return Response.json({ error: 'Scenario not found' }, { status: 404 })

  const version = await loadLatestVersion(auth, scenarioId)
  if (!version) return Response.json({ tokens: [] })

  const { data, error } = await auth.sb
    .from('scenario_share_tokens')
    .select('*')
    .eq('scenario_version_id', version.id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: 'Failed to load share links' }, { status: 500 })

  return Response.json({ tokens: (data ?? []).map(rowToShareToken) })
}

export async function POST(request: Request, { params }: { params: Promise<{ scenarioId: string }> }) {
  const { scenarioId } = await params
  const auth = await authenticateRequest(request)
  if (!auth) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const scenario = await requireOwnedScenario(auth, scenarioId)
  if (!scenario) return Response.json({ error: 'Scenario not found' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const payload = parseShareTokenCreate(body)
  if ('error' in payload) return Response.json({ error: payload.error }, { status: 400 })

  const version = await loadLatestVersion(auth, scenarioId)
  if (!version) return Response.json({ error: 'Scenario has not been published' }, { status: 404 })

  const { data, error } = await auth.sb
    .from('scenario_share_tokens')
    .insert({
      scenario_version_id: version.id,
      scenario_id: version.scenario_id,
      token: generateShareToken(),
      label: payload.label ?? null,
      created_by: auth.userId,
      expires_at: payload.expiresAt ?? null,
    })
    .select()
    .single()

  if (error || !data) return Response.json({ error: 'Failed to create share link' }, { status: 500 })

  return Response.json({ token: rowToShareToken(data) }, { status: 201 })
}
