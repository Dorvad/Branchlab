// Lightweight TypeScript-safe payload validation for the analytics write routes.
// No schema library — these are small, fixed shapes and a few `typeof` checks
// are clearer than pulling in a dependency.

import type { PlayerEventType } from '@/types/analytics'

const EVENT_TYPES: readonly PlayerEventType[] = [
  'session_started',
  'node_viewed',
  'video_started',
  'video_completed',
  'choice_viewed',
  'choice_selected',
  'feedback_viewed',
  'ending_reached',
  'session_completed',
  'session_restarted',
]

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= 4096
}

function isOptionalString(v: unknown): v is string | undefined {
  return v === undefined || v === null || (typeof v === 'string' && v.length <= 4096)
}

function isOptionalInt(v: unknown): v is number | undefined {
  return v === undefined || v === null || (typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v))
}

// ── session/start ─────────────────────────────────────────────────────────────

export interface SessionStartPayload {
  sessionId: string
  scenarioVersionId: string
  slug: string
  visitorId?: string
  isPreview?: boolean
}

export function parseSessionStart(body: unknown): SessionStartPayload | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (!isUuid(b.sessionId)) return null
  if (!isUuid(b.scenarioVersionId)) return null
  if (!isNonEmptyString(b.slug)) return null
  if (!isOptionalString(b.visitorId)) return null
  if (b.isPreview !== undefined && typeof b.isPreview !== 'boolean') return null
  return {
    sessionId: b.sessionId,
    scenarioVersionId: b.scenarioVersionId,
    slug: b.slug,
    visitorId: b.visitorId as string | undefined,
    isPreview: b.isPreview === true,
  }
}

// ── event ─────────────────────────────────────────────────────────────────────

export interface EventPayload {
  sessionId: string
  scenarioVersionId: string
  eventType: PlayerEventType
  nodeId?: string
  choiceId?: string
  choiceLabel?: string
  targetNodeId?: string
  endingNodeId?: string
  scoreDelta?: number
  score?: Record<string, number>
  eventData?: Record<string, unknown>
}

export function parseEvent(body: unknown): EventPayload | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (!isUuid(b.sessionId)) return null
  if (!isUuid(b.scenarioVersionId)) return null
  if (typeof b.eventType !== 'string' || !EVENT_TYPES.includes(b.eventType as PlayerEventType)) return null
  if (!isOptionalString(b.nodeId)) return null
  if (!isOptionalString(b.choiceId)) return null
  if (!isOptionalString(b.choiceLabel)) return null
  if (!isOptionalString(b.targetNodeId)) return null
  if (!isOptionalString(b.endingNodeId)) return null
  if (!isOptionalInt(b.scoreDelta)) return null
  if (b.score !== undefined && b.score !== null && (typeof b.score !== 'object' || Array.isArray(b.score))) return null
  if (b.eventData !== undefined && b.eventData !== null && (typeof b.eventData !== 'object' || Array.isArray(b.eventData))) return null

  return {
    sessionId: b.sessionId,
    scenarioVersionId: b.scenarioVersionId,
    eventType: b.eventType as PlayerEventType,
    nodeId: b.nodeId as string | undefined,
    choiceId: b.choiceId as string | undefined,
    choiceLabel: b.choiceLabel as string | undefined,
    targetNodeId: b.targetNodeId as string | undefined,
    endingNodeId: b.endingNodeId as string | undefined,
    scoreDelta: b.scoreDelta as number | undefined,
    score: (b.score as Record<string, number> | undefined) ?? undefined,
    eventData: (b.eventData as Record<string, unknown> | undefined) ?? undefined,
  }
}

// ── session/complete ──────────────────────────────────────────────────────────

export interface SessionCompletePayload {
  sessionId: string
  scenarioVersionId: string
  endingNodeId?: string
  totalScore?: number
  durationSeconds?: number
}

export function parseSessionComplete(body: unknown): SessionCompletePayload | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (!isUuid(b.sessionId)) return null
  if (!isUuid(b.scenarioVersionId)) return null
  if (!isOptionalString(b.endingNodeId)) return null
  if (!isOptionalInt(b.totalScore)) return null
  if (!isOptionalInt(b.durationSeconds)) return null
  return {
    sessionId: b.sessionId,
    scenarioVersionId: b.scenarioVersionId,
    endingNodeId: b.endingNodeId as string | undefined,
    totalScore: b.totalScore as number | undefined,
    durationSeconds: b.durationSeconds as number | undefined,
  }
}
