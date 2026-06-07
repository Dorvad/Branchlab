'use client'

import type { PlayerEventType } from '@/types/analytics'

// Analytics writes go through server route handlers (see src/app/api/analytics/**)
// rather than direct Supabase inserts: the server resolves the canonical
// scenario_id from the published slug/version, validates payload shapes, and
// skips preview sessions — none of which a client write can be trusted to do.

async function post(url: string, body: unknown): Promise<void> {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    })
  } catch {
    // fail silently — analytics must never break playback
  }
}

export async function createPlayerSession(opts: {
  sessionId: string
  scenarioVersionId: string
  scenarioId: string
  slug: string
  isPreview?: boolean
}): Promise<void> {
  await post('/api/analytics/session/start', {
    sessionId: opts.sessionId,
    scenarioVersionId: opts.scenarioVersionId,
    slug: opts.slug,
    visitorId: getVisitorId(),
    isPreview: opts.isPreview === true,
  })
}

export async function trackPlayerEvent(opts: {
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
}): Promise<void> {
  await post('/api/analytics/event', {
    sessionId: opts.sessionId,
    scenarioVersionId: opts.scenarioVersionId,
    eventType: opts.eventType,
    nodeId: opts.nodeId,
    choiceId: opts.choiceId,
    choiceLabel: opts.choiceLabel,
    targetNodeId: opts.targetNodeId,
    endingNodeId: opts.endingNodeId,
    scoreDelta: opts.scoreDelta,
    score: opts.score,
    eventData: opts.metadata,
  })
}

export async function completePlayerSession(opts: {
  sessionId: string
  scenarioVersionId: string
  endingNodeId?: string
  totalScore?: number
  durationSeconds?: number
}): Promise<void> {
  await post('/api/analytics/session/complete', {
    sessionId: opts.sessionId,
    scenarioVersionId: opts.scenarioVersionId,
    endingNodeId: opts.endingNodeId,
    totalScore: opts.totalScore,
    durationSeconds: opts.durationSeconds,
  })
}

// Stable anonymous visitor ID persisted in localStorage
function getVisitorId(): string {
  try {
    const key = 'bl_visitor_id'
    let id = localStorage.getItem(key)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(key, id)
    }
    return id
  } catch {
    return 'unknown'
  }
}
