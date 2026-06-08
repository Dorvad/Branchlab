// POST /api/facilitator/vote
//
// Resolves the canonical participant id from (session_id, anonymous_id)
// server-side — never trusts a client-supplied participant id — and only
// accepts votes while the room is actually collecting them. The unique
// (session_id, participant_id, node_id) constraint makes resubmission of the
// same vote idempotent (refresh-safe); changing your mind before results are
// revealed updates the existing row instead of creating a duplicate.

import { getSupabaseServer } from '@/lib/supabase/server'
import { parseVote } from '@/lib/facilitator/validate'
import { rowToSession } from '@/lib/facilitator/rows'

// Published scenario versions are immutable — cache their node/choice maps
// so we don't re-fetch the full nodes JSONB on every vote.
const nodesCache = new Map<string, Array<{ id: string; choices: Array<{ id: string }> }>>()

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const payload = parseVote(body)
  if (!payload) return Response.json({ error: 'Invalid payload' }, { status: 400 })

  const sb = getSupabaseServer()

  const { data: sessionRow, error: sessionError } = await sb
    .from('facilitator_sessions')
    .select('*')
    .eq('id', payload.sessionId)
    .maybeSingle()

  if (sessionError || !sessionRow) {
    return Response.json({ error: 'Unknown session' }, { status: 404 })
  }

  const session = rowToSession(sessionRow)

  if (session.status !== 'live') {
    return Response.json({ error: 'This session is not currently live' }, { status: 409 })
  }
  if (session.phase !== 'voting_open') {
    return Response.json({ error: 'Voting is not open right now' }, { status: 409 })
  }
  if (session.currentNodeId !== payload.nodeId) {
    return Response.json({ error: 'That scene is no longer active' }, { status: 409 })
  }

  const { data: participant, error: participantError } = await sb
    .from('facilitator_participants')
    .select('id')
    .eq('session_id', session.id)
    .eq('anonymous_id', payload.anonymousId)
    .maybeSingle()

  if (participantError || !participant) {
    return Response.json({ error: 'Join the session before voting' }, { status: 403 })
  }

  const participantId = (participant as { id: string }).id

  // Validate the choice actually belongs to the current node in the published snapshot.
  // Use the module-level cache — scenario versions are immutable once published.
  let nodes = nodesCache.get(session.scenarioVersionId)
  if (!nodes) {
    const { data: versionRow } = await sb
      .from('scenario_versions')
      .select('nodes')
      .eq('id', session.scenarioVersionId)
      .maybeSingle()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nodes = ((versionRow as any)?.nodes as Array<{ id: string; choices: Array<{ id: string }> }>) ?? []
    nodesCache.set(session.scenarioVersionId, nodes)
  }
  const node = nodes.find(n => n.id === payload.nodeId)
  const choiceValid = node?.choices?.some(c => c.id === payload.choiceId)
  if (!choiceValid) {
    return Response.json({ error: 'Invalid choice for this scene' }, { status: 400 })
  }

  const { error: upsertError } = await sb
    .from('facilitator_votes')
    .upsert(
      {
        session_id: session.id,
        participant_id: participantId,
        node_id: payload.nodeId,
        choice_id: payload.choiceId,
      },
      { onConflict: 'session_id,participant_id,node_id' }
    )

  if (upsertError) return Response.json({ error: 'Failed to record vote' }, { status: 500 })

  return Response.json({ ok: true })
}
