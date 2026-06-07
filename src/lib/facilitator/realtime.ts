'use client'

// Supabase Realtime subscriptions for facilitator rooms, with a polling
// fallback for environments where Realtime isn't reliable (e.g. local dev
// without the Realtime service enabled, or a flaky connection).
//
// Usage: subscribeToRoom(sessionId, { onSession, onParticipants, onVotes })
// returns an unsubscribe function. Internally it opens one postgres_changes
// channel per table and ALSO starts a low-frequency poll as a backstop —
// the poll is cheap (single-row / small-table reads) and guarantees the room
// keeps moving even if a websocket drops silently.

import { getSupabaseClient } from '@/lib/supabase/client'
import { getFacilitatorSession } from './host'
import { fetchParticipants, fetchVotes } from './participant'
import type { FacilitatorSession, FacilitatorParticipant, FacilitatorVote } from '@/types/facilitator'

const POLL_INTERVAL_MS = 4000

export interface RoomSubscriptionHandlers {
  onSession?: (session: FacilitatorSession) => void
  onParticipants?: (participants: FacilitatorParticipant[]) => void
  onVotes?: (votes: FacilitatorVote[]) => void
}

export function subscribeToRoom(sessionId: string, handlers: RoomSubscriptionHandlers): () => void {
  const sb = getSupabaseClient()

  const refreshSession = async () => {
    const session = await getFacilitatorSession(sessionId)
    if (session) handlers.onSession?.(session)
  }
  const refreshParticipants = async () => {
    handlers.onParticipants?.(await fetchParticipants(sessionId))
  }
  const refreshVotes = async () => {
    handlers.onVotes?.(await fetchVotes(sessionId))
  }

  const channel = sb
    .channel(`facilitator-room-${sessionId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'facilitator_sessions', filter: `id=eq.${sessionId}` },
      () => { void refreshSession() }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'facilitator_participants', filter: `session_id=eq.${sessionId}` },
      () => { void refreshParticipants() }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'facilitator_votes', filter: `session_id=eq.${sessionId}` },
      () => { void refreshVotes() }
    )
    .subscribe()

  // Initial load
  void refreshSession()
  void refreshParticipants()
  void refreshVotes()

  // Polling backstop — keeps the room live even if the websocket silently drops.
  const poll = setInterval(() => {
    void refreshSession()
    void refreshParticipants()
    void refreshVotes()
  }, POLL_INTERVAL_MS)

  return () => {
    clearInterval(poll)
    void sb.removeChannel(channel)
  }
}
