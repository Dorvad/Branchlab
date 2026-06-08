// DELETE /api/scenarios/[scenarioId]/share-tokens/[tokenId] — revoke a share link
//
// "Revoke" sets revoked_at rather than deleting, so use_count/last_used_at
// history is preserved for the owner. Owner-only via RLS (see migration 013 —
// "owner update"/"owner delete" policies on scenario_share_tokens check that
// the requester owns the scenario_versions row the token points at).

import { authenticateRequest, requireOwnedScenario } from '@/lib/sharing'

export async function DELETE(request: Request, { params }: { params: Promise<{ scenarioId: string; tokenId: string }> }) {
  const { scenarioId, tokenId } = await params
  const auth = await authenticateRequest(request)
  if (!auth) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const scenario = await requireOwnedScenario(auth, scenarioId)
  if (!scenario) return Response.json({ error: 'Scenario not found' }, { status: 404 })

  // Scope the update to tokens belonging to this scenario's versions —
  // RLS also enforces this, but checking here gives a clean 404 for
  // cross-scenario token IDs instead of a silent no-op.
  const { data: tokenRow } = await auth.sb
    .from('scenario_share_tokens')
    .select('id, scenario_id')
    .eq('id', tokenId)
    .maybeSingle()

  if (!tokenRow || (tokenRow as { scenario_id: string | null }).scenario_id !== scenarioId) {
    return Response.json({ error: 'Share link not found' }, { status: 404 })
  }

  const { error } = await auth.sb
    .from('scenario_share_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', tokenId)

  if (error) return Response.json({ error: 'Failed to revoke share link' }, { status: 500 })

  return Response.json({ ok: true })
}
