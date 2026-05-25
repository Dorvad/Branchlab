'use client'

import { getSupabaseClient } from '@/lib/supabase/client'
import type { PlayerEventType } from '@/types/analytics'

function sb() {
  return getSupabaseClient()
}

export async function createPlayerSession(opts: {
  sessionId: string
  scenarioVersionId: string
  scenarioId: string
  slug: string
}): Promise<void> {
  try {
    await sb().from('player_sessions').insert({
      id: opts.sessionId,
      scenario_version_id: opts.scenarioVersionId,
      scenario_id: opts.scenarioId,
      slug: opts.slug,
      visitor_id: getVisitorId(),
      user_agent: navigator.userAgent.slice(0, 512),
      referrer: document.referrer.slice(0, 512) || null,
    })
  } catch {
    // fail silently — analytics must never break playback
  }
}

export async function trackPlayerEvent(opts: {
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
}): Promise<void> {
  try {
    await sb().from('player_events').insert({
      session_id: opts.sessionId,
      scenario_version_id: opts.scenarioVersionId,
      scenario_id: opts.scenarioId,
      event_type: opts.eventType,
      node_id: opts.nodeId ?? null,
      choice_id: opts.choiceId ?? null,
      target_node_id: opts.targetNodeId ?? null,
      ending_node_id: opts.endingNodeId ?? null,
      score: opts.score ?? null,
      metadata: opts.metadata ?? {},
    })
  } catch {
    // fail silently
  }
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
