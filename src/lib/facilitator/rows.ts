// Row ↔ Type mappers for the facilitator_* tables (snake_case DB ↔ camelCase app types).

import type {
  FacilitatorSession,
  FacilitatorParticipant,
  FacilitatorVote,
  FacilitatorSessionEvent,
  FacilitatorDecision,
  FacilitatorEventType,
} from '@/types/facilitator'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToSession(row: any): FacilitatorSession {
  return {
    id: row.id,
    hostUserId: row.host_user_id,
    scenarioId: row.scenario_id,
    scenarioVersionId: row.scenario_version_id,
    joinCode: row.join_code,
    status: row.status,
    currentNodeId: row.current_node_id ?? null,
    phase: row.phase,
    votingOpenedAt: row.voting_opened_at ?? null,
    resultsRevealedAt: row.results_revealed_at ?? null,
    chosenChoiceId: row.chosen_choice_id ?? null,
    visitedNodeIds: (row.visited_node_ids as string[]) ?? [],
    decisionLog: (row.decision_log as FacilitatorDecision[]) ?? [],
    startedAt: row.started_at ?? null,
    endedAt: row.ended_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToParticipant(row: any): FacilitatorParticipant {
  return {
    id: row.id,
    sessionId: row.session_id,
    anonymousId: row.anonymous_id,
    displayName: row.display_name ?? null,
    joinedAt: row.joined_at,
    lastSeenAt: row.last_seen_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToVote(row: any): FacilitatorVote {
  return {
    id: row.id,
    sessionId: row.session_id,
    participantId: row.participant_id,
    nodeId: row.node_id,
    choiceId: row.choice_id,
    createdAt: row.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToSessionEvent(row: any): FacilitatorSessionEvent {
  return {
    id: row.id,
    sessionId: row.session_id,
    eventType: row.event_type as FacilitatorEventType,
    nodeId: row.node_id ?? null,
    choiceId: row.choice_id ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
  }
}
