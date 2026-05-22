import type { Scenario, ScenarioVersion } from './index'

export type PlayerEventType =
  | 'session_started'
  | 'node_viewed'
  | 'choice_selected'
  | 'feedback_viewed'
  | 'ending_reached'
  | 'session_completed'

export interface PlayerSessionRow {
  id: string
  scenarioVersionId: string
  scenarioId: string
  slug: string
  visitorId?: string
  startedAt: string
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
  targetNodeId?: string
  endingNodeId?: string
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
  }>
}
