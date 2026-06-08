import type { Scenario, ScenarioVersion } from './index'

export type PlayerEventType =
  | 'session_started'
  | 'node_viewed'
  | 'video_started'
  | 'video_completed'
  | 'choice_viewed'
  | 'choice_selected'
  | 'feedback_viewed'
  | 'ending_reached'
  | 'session_completed'
  | 'session_restarted'

export interface PlayerSessionRow {
  id: string
  scenarioVersionId: string
  scenarioId: string
  slug: string
  visitorId?: string
  startedAt: string
  isPreview?: boolean
  completedAt?: string
  lastEventAt?: string
  endingNodeId?: string
  totalScore?: number
  durationSeconds?: number
  userAgent?: string
  referrer?: string
}

export interface PlayerEventRow {
  id: string
  sessionId: string
  scenarioVersionId: string
  scenarioId: string
  eventType: PlayerEventType
  nodeId?: string
  choiceId?: string
  choiceLabel?: string
  targetNodeId?: string
  endingNodeId?: string
  scoreDelta?: number
  score?: Record<string, number>
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface ScenarioAnalytics {
  scenario: Scenario
  publishedVersion: ScenarioVersion | null
  summary: {
    totalPlays: number
    completedSessions: number
    completionRate: number
    averageCompletionSeconds: number | null
    /** Mean of `total_score` across completed sessions; null when the scenario has no scoring. */
    averageScore: number | null
    mostReachedEnding: {
      nodeId: string
      title: string
      count: number
    } | null
  }
  funnel: {
    started: number
    firstChoice: number
    completed: number
  }
  choices: Array<{
    nodeId: string
    nodeTitle: string
    totalSelections: number
    choices: Array<{
      choiceId: string
      label: string
      targetNodeId: string
      count: number
      percentage: number
    }>
  }>
  endings: Array<{
    nodeId: string
    title: string
    count: number
    percentage: number
  }>
  dropOffs: Array<{
    nodeId: string
    title: string
    count: number
    percentage: number
  }>
  recentSessions: Array<{
    sessionId: string
    startedAt: string
    completed: boolean
    endingNodeId?: string
    endingTitle?: string
    durationSeconds?: number
    choiceCount: number
    score?: number
    /** Human-readable node-title path, e.g. "Opening → Choice A → Good Ending" */
    path: string[]
  }>
}
