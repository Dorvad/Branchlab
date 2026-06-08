import type { Scenario, ScenarioVersion, ScenarioNode } from './index'

export type FacilitatorSessionStatus = 'waiting' | 'live' | 'ended'

export type FacilitatorPhase =
  | 'showing_scene'
  | 'voting_open'
  | 'results_revealed'
  | 'discussing'
  | 'ended'

export type FacilitatorEventType =
  | 'session_created'
  | 'session_started'
  | 'participant_joined'
  | 'scene_shown'
  | 'voting_opened'
  | 'voting_closed'
  | 'results_revealed'
  | 'choice_made'
  | 'discussion_started'
  | 'session_ended'

/** One entry in a session's `decision_log` — what the host actually chose at a node. */
export interface FacilitatorDecision {
  nodeId: string
  nodeTitle: string
  choiceId: string
  choiceLabel: string
  /** Was the host's pick the same as the audience majority? */
  followedMajority: boolean
  voteCounts: Record<string, number>
  totalVotes: number
  decidedAt: string
}

export interface FacilitatorSession {
  id: string
  hostUserId: string
  scenarioId: string
  scenarioVersionId: string
  joinCode: string
  status: FacilitatorSessionStatus
  currentNodeId: string | null
  phase: FacilitatorPhase
  votingOpenedAt: string | null
  resultsRevealedAt: string | null
  chosenChoiceId: string | null
  visitedNodeIds: string[]
  decisionLog: FacilitatorDecision[]
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface FacilitatorParticipant {
  id: string
  sessionId: string
  anonymousId: string
  displayName: string | null
  joinedAt: string
  lastSeenAt: string
}

export interface FacilitatorVote {
  id: string
  sessionId: string
  participantId: string
  nodeId: string
  choiceId: string
  createdAt: string
}

export interface FacilitatorSessionEvent {
  id: string
  sessionId: string
  eventType: FacilitatorEventType
  nodeId: string | null
  choiceId: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

/** Live tally for a single choice at the current node. */
export interface FacilitatorVoteTally {
  choiceId: string
  label: string
  targetNodeId: string
  count: number
  percentage: number
}

/** Everything the host control room and the participant join screen need to render. */
export interface FacilitatorRoomState {
  session: FacilitatorSession
  scenario: Scenario
  publishedVersion: ScenarioVersion
  currentNode: ScenarioNode | null
  participants: FacilitatorParticipant[]
  votes: FacilitatorVote[]
  tallies: FacilitatorVoteTally[]
  totalVotes: number
}

/** Data shown on the deterministic end-of-session summary screen. */
export interface FacilitatorSessionSummary {
  session: FacilitatorSession
  scenario: Scenario
  participantCount: number
  totalVotes: number
  decisions: FacilitatorDecision[]
  pathTitles: string[]
  durationSeconds: number | null
  endingNodeId: string | null
  endingTitle: string | null
}
