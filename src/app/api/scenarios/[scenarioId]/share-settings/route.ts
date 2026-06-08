// GET    /api/scenarios/[scenarioId]/share-settings — owner reads current settings
// PATCH  /api/scenarios/[scenarioId]/share-settings — owner updates visibility/password/access
//
// Owner-only: the request must carry the user's Supabase access token, which
// we use to create a per-request authenticated client. RLS's "owner select"
// policy on `scenarios` then naturally enforces ownership — a non-owner's
// token resolves zero rows. We never return password_hash to the client.

import { authenticateRequest, requireOwnedScenario, hashSharePassword, parseShareSettingsPatch, versionRowToShareSettings } from '@/lib/sharing'

async function loadLatestVersion(auth: Awaited<ReturnType<typeof authenticateRequest>>, scenarioId: string) {
  if (!auth) return null
  const { data } = await auth.sb
    .from('scenario_versions')
    .select('*')
    .eq('scenario_id', scenarioId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as Record<string, unknown> | null
}

export async function GET(request: Request, { params }: { params: Promise<{ scenarioId: string }> }) {
  const { scenarioId } = await params
  const auth = await authenticateRequest(request)
  if (!auth) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const scenario = await requireOwnedScenario(auth, scenarioId)
  if (!scenario) return Response.json({ error: 'Scenario not found' }, { status: 404 })

  const versionRow = await loadLatestVersion(auth, scenarioId)
  if (!versionRow) return Response.json({ error: 'Scenario has not been published' }, { status: 404 })

  return Response.json({ shareSettings: versionRowToShareSettings(versionRow, scenarioId) })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ scenarioId: string }> }) {
  const { scenarioId } = await params
  const auth = await authenticateRequest(request)
  if (!auth) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const scenario = await requireOwnedScenario(auth, scenarioId)
  if (!scenario) return Response.json({ error: 'Scenario not found' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const patch = parseShareSettingsPatch(body)
  if ('error' in patch) return Response.json({ error: patch.error }, { status: 400 })

  const versionRow = await loadLatestVersion(auth, scenarioId)
  if (!versionRow) return Response.json({ error: 'Scenario has not been published' }, { status: 404 })
  const versionId = (versionRow as { id: string }).id

  const update: Record<string, unknown> = {}
  if (patch.visibility !== undefined) update.visibility = patch.visibility
  if (patch.accessEnabled !== undefined) update.access_enabled = patch.accessEnabled

  if (patch.password !== undefined) {
    if (patch.password === null || patch.password === '') {
      update.password_hash = null
    } else {
      // Hash server-side — the plaintext password never touches the database
      // or any log. (Do not log `patch.password` anywhere.)
      update.password_hash = await hashSharePassword(patch.password)
    }
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ shareSettings: versionRowToShareSettings(versionRow, scenarioId) })
  }

  const { data: updated, error } = await auth.sb
    .from('scenario_versions')
    .update(update)
    .eq('id', versionId)
    .select()
    .single()

  if (error || !updated) return Response.json({ error: 'Failed to update share settings' }, { status: 500 })

  // The dashboard reads visibility/access state from the cached snapshot in
  // `scenarios.published_version` (not a live `scenario_versions` join), so
  // keep that snapshot's visibility/accessEnabled in sync — otherwise the
  // dashboard badge would show stale data until the next publish.
  if (patch.visibility !== undefined || patch.accessEnabled !== undefined) {
    const cached = scenario.published_version as Record<string, unknown> | null
    if (cached && typeof cached === 'object') {
      const syncedSnapshot = {
        ...cached,
        ...(patch.visibility !== undefined && { visibility: patch.visibility }),
        ...(patch.accessEnabled !== undefined && { accessEnabled: patch.accessEnabled }),
      }
      await auth.sb
        .from('scenarios')
        .update({ published_version: syncedSnapshot })
        .eq('id', scenarioId)
    }
  }

  return Response.json({ shareSettings: versionRowToShareSettings(updated, scenarioId) })
}
