// Host-side facilitator session functions. These run direct client-side
// Supabase writes via getSupabaseClient() — NOT through API routes — because
// the host is signed in and RLS on facilitator_sessions is keyed off
// host_user_id = auth.uid(). This mirrors how the editor saves scenarios.

import { getSupabaseClient } from '@/lib/supabase/client'
import { generateJoinCode } from './codes'
import { rowToSession, rowToSessionEvent } from './rows'
import type { Scenario, ScenarioVersion } from '@/types'
import type {
  FacilitatorSession,
  FacilitatorSessionEvent,
  FacilitatorEventType,
  FacilitatorDecision,
} from '@/types/facilitator'

function dbError(err: unknown): Error {
  const e = err as { message?: string; details?: string; hint?: string } | null
  return new Error(e?.message ?? e?.details ?? e?.hint ?? 'Database error')
}

async function requireUserId(): Promise<string> {
  const sb = getSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// ── Create / list / read ──────────────────────────────────────────────────────

const MAX_JOIN_CODE_ATTEMPTS = 5

/**
 * Creates a new facilitator session for a published scenario version.
 * Retries join-code generation on the rare collision (unique constraint).
 */
export async function createFacilitatorSession(
  scenario: Scenario,
  version: ScenarioVersion
): Promise<FacilitatorSession> {
  const userId = await requireUserId()
  const sb = getSupabaseClient()

  let lastError: unknown = null
  for (let attempt = 0; attempt < MAX_JOIN_CODE_ATTEMPTS; attempt++) {
    const joinCode = generateJoinCode()
    const { data, error } = await sb
      .from('facilitator_sessions')
      .insert({
        host_user_id: userId,
        scenario_id: scenario.id,
        scenario_version_id: version.id,
        join_code: joinCode,
        status: 'waiting',
        phase: 'showing_scene',
        current_node_id: version.startNodeId,
        visited_node_ids: [version.startNodeId],
        decision_log: [],
      })
      .select()
      .single()

    if (!error && data) {
      const session = rowToSession(data)
      await logSessionEvent(session.id, 'session_created', { nodeId: version.startNodeId })
      return session
    }
    lastError = error
    // 23505 = unique_violation — try again with a fresh code
    if ((error as { code?: string } | null)?.code !== '23505') break
  }
  throw dbError(lastError)
}

export async function listFacilitatorSessions(scenarioId: string): Promise<FacilitatorSession[]> {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('facilitator_sessions')
    .select('*')
    .eq('scenario_id', scenarioId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw dbError(error)
  return (data ?? []).map(rowToSession)
}

export async function getFacilitatorSession(sessionId: string): Promise<FacilitatorSession | null> {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('facilitator_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()

  if (error || !data) return null
  return rowToSession(data)
}

// ── Event log ─────────────────────────────────────────────────────────────────

export async function logSessionEvent(
  sessionId: string,
  eventType: FacilitatorEventType,
  fields: { nodeId?: string | null; choiceId?: string | null; metadata?: Record<string, unknown> } = {}
): Promise<void> {
  const sb = getSupabaseClient()
  const { error } = await sb.from('facilitator_session_events').insert({
    session_id: sessionId,
    event_type: eventType,
    node_id: fields.nodeId ?? null,
    choice_id: fields.choiceId ?? null,
    metadata: fields.metadata ?? {},
  })
  // Don't throw — a logging failure shouldn't block the host action that
  // triggered it, but a silent gap in the audit trail/CSV export is hard to
  // diagnose, so at least surface it.
  if (error) console.error('[facilitator] failed to log session event', eventType, error)
}

export async function listSessionEvents(sessionId: string): Promise<FacilitatorSessionEvent[]> {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('facilitator_session_events')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw dbError(error)
  return (data ?? []).map(rowToSessionEvent)
}

// ── Host controls ─────────────────────────────────────────────────────────────
//
// Each control is a direct row update (RLS enforces host_user_id = auth.uid())
// plus an event-log entry, so the room's history and Realtime feed stay in sync.

async function updateSession(
  sessionId: string,
  patch: Record<string, unknown>
): Promise<FacilitatorSession> {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('facilitator_sessions')
    .update(patch)
    .eq('id', sessionId)
    .select()
    .single()

  if (error) throw dbError(error)
  return rowToSession(data)
}

/** Moves a waiting room into 'live' and shows the start node. */
export async function startFacilitatorSession(sessionId: string, startNodeId: string): Promise<FacilitatorSession> {
  const session = await updateSession(sessionId, {
    status: 'live',
    phase: 'showing_scene',
    current_node_id: startNodeId,
    started_at: new Date().toISOString(),
  })
  await logSessionEvent(sessionId, 'session_started', { nodeId: startNodeId })
  await logSessionEvent(sessionId, 'scene_shown', { nodeId: startNodeId })
  return session
}

/** Opens voting on the currently-shown node. */
export async function openVoting(sessionId: string, nodeId: string): Promise<FacilitatorSession> {
  const session = await updateSession(sessionId, {
    phase: 'voting_open',
    voting_opened_at: new Date().toISOString(),
    chosen_choice_id: null,
  })
  await logSessionEvent(sessionId, 'voting_opened', { nodeId })
  return session
}

/** Closes voting and reveals the live tally to the room. */
export async function revealResults(sessionId: string, nodeId: string): Promise<FacilitatorSession> {
  const session = await updateSession(sessionId, {
    phase: 'results_revealed',
    results_revealed_at: new Date().toISOString(),
  })
  await logSessionEvent(sessionId, 'voting_closed', { nodeId })
  await logSessionEvent(sessionId, 'results_revealed', { nodeId })
  return session
}

/** Moves the room from "results revealed" into open discussion. */
export async function startDiscussion(sessionId: string, nodeId: string): Promise<FacilitatorSession> {
  const session = await updateSession(sessionId, { phase: 'discussing' })
  await logSessionEvent(sessionId, 'discussion_started', { nodeId })
  return session
}

/**
 * Records the host's chosen path (which may differ from the audience majority)
 * and advances the room to the target node. This is the moment that defines
 * Facilitator Mode: the HOST decides, not the vote.
 */
export async function chooseAndAdvance(
  session: FacilitatorSession,
  decision: FacilitatorDecision,
  targetNodeId: string
): Promise<FacilitatorSession> {
  const visited = session.visitedNodeIds.includes(targetNodeId)
    ? session.visitedNodeIds
    : [...session.visitedNodeIds, targetNodeId]

  const updated = await updateSession(session.id, {
    chosen_choice_id: decision.choiceId,
    current_node_id: targetNodeId,
    phase: 'showing_scene',
    visited_node_ids: visited,
    decision_log: [...session.decisionLog, decision],
    voting_opened_at: null,
    results_revealed_at: null,
  })
  await logSessionEvent(session.id, 'choice_made', {
    nodeId: decision.nodeId,
    choiceId: decision.choiceId,
    metadata: { followedMajority: decision.followedMajority, targetNodeId },
  })
  await logSessionEvent(session.id, 'scene_shown', { nodeId: targetNodeId })
  return updated
}

/** Ends the session (also used when the host lands on an ending node). */
export async function endFacilitatorSession(sessionId: string, endingNodeId?: string | null): Promise<FacilitatorSession> {
  const session = await updateSession(sessionId, {
    status: 'ended',
    phase: 'ended',
    ended_at: new Date().toISOString(),
    ...(endingNodeId ? { current_node_id: endingNodeId } : {}),
  })
  await logSessionEvent(sessionId, 'session_ended', { nodeId: endingNodeId ?? session.currentNodeId })
  return session
}
