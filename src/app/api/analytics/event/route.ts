// POST /api/analytics/event
//
// Records a single lifecycle/interaction event for an existing session.
// Validated and resolved server-side so a client can't write events against
// scenarios it doesn't control or under arbitrary scenario_version ids.

import { getSupabaseServer } from '@/lib/supabase/server'
import { parseEvent } from '@/lib/analytics/validate'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const payload = parseEvent(body)
  if (!payload) return Response.json({ error: 'Invalid payload' }, { status: 400 })

  const sb = getSupabaseServer()

  // The session row is the source of truth for which scenario this event
  // belongs to — look it up rather than trusting the client's scenarioVersionId.
  const { data: session, error: sessionError } = await sb
    .from('player_sessions')
    .select('id, scenario_id, scenario_version_id, is_preview')
    .eq('id', payload.sessionId)
    .eq('scenario_version_id', payload.scenarioVersionId)
    .maybeSingle()

  if (sessionError || !session) {
    return Response.json({ error: 'Unknown session' }, { status: 404 })
  }

  const row = session as { id: string; scenario_id: string; scenario_version_id: string; is_preview: boolean }
  if (row.is_preview) return Response.json({ ok: true, skipped: true })

  const now = new Date().toISOString()

  const { error } = await sb.from('player_events').insert({
    session_id: row.id,
    scenario_version_id: row.scenario_version_id,
    scenario_id: row.scenario_id,
    event_type: payload.eventType,
    node_id: payload.nodeId ?? null,
    choice_id: payload.choiceId ?? null,
    choice_label: payload.choiceLabel ?? null,
    target_node_id: payload.targetNodeId ?? null,
    ending_node_id: payload.endingNodeId ?? null,
    score_delta: payload.scoreDelta ?? null,
    score: payload.score ?? null,
    metadata: payload.eventData ?? {},
  })

  if (error) return Response.json({ error: 'Failed to record event' }, { status: 500 })

  // Keep last_event_at fresh so "active session" queries don't need to scan player_events.
  await sb.from('player_sessions').update({ last_event_at: now }).eq('id', row.id)

  return Response.json({ ok: true })
}
