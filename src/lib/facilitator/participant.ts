'use client'

// Participant-side helpers: anonymous identity + reads. Joining and voting go
// through server route handlers (see src/app/api/facilitator/**) because an
// anonymous participant has no Supabase auth session — the server resolves
// the canonical participant id from (session_id, anonymous_id) rather than
// trusting a client-supplied id, mirroring src/lib/analytics/track.ts.

import { getSupabaseClient } from '@/lib/supabase/client'
import { rowToParticipant, rowToVote } from './rows'
import type { FacilitatorParticipant, FacilitatorVote } from '@/types/facilitator'

const ANONYMOUS_ID_KEY = 'bl_facilitator_anon_id'

/** Stable anonymous participant ID persisted in localStorage — refresh-safe. */
export function getAnonymousId(): string {
  try {
    let id = localStorage.getItem(ANONYMOUS_ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(ANONYMOUS_ID_KEY, id)
    }
    return id
  } catch {
    return 'unknown'
  }
}

export interface JoinResult {
  ok: boolean
  participant?: FacilitatorParticipant
  session?: { id: string; status: string; joinCode: string }
  error?: string
}

export async function joinFacilitatorSession(opts: {
  joinCode: string
  displayName?: string
}): Promise<JoinResult> {
  try {
    const res = await fetch('/api/facilitator/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        joinCode: opts.joinCode,
        anonymousId: getAnonymousId(),
        displayName: opts.displayName,
      }),
    })
    const body = await res.json()
    if (!res.ok) return { ok: false, error: body?.error ?? 'Failed to join' }
    return {
      ok: true,
      participant: body.participant,
      session: body.session,
    }
  } catch {
    return { ok: false, error: 'Network error — check your connection and try again.' }
  }
}

export interface VoteResult {
  ok: boolean
  error?: string
}

export async function castVote(opts: {
  sessionId: string
  nodeId: string
  choiceId: string
}): Promise<VoteResult> {
  try {
    const res = await fetch('/api/facilitator/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: opts.sessionId,
        anonymousId: getAnonymousId(),
        nodeId: opts.nodeId,
        choiceId: opts.choiceId,
      }),
    })
    const body = await res.json()
    if (!res.ok) return { ok: false, error: body?.error ?? 'Failed to submit vote' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Network error — your vote was not submitted.' }
  }
}

// ── Reads (public — RLS allows reading live/waiting sessions) ─────────────────

export async function fetchParticipants(sessionId: string): Promise<FacilitatorParticipant[]> {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('facilitator_participants')
    .select('*')
    .eq('session_id', sessionId)
    .order('joined_at', { ascending: true })

  if (error) return []
  return (data ?? []).map(rowToParticipant)
}

export async function fetchVotes(sessionId: string, nodeId?: string): Promise<FacilitatorVote[]> {
  const sb = getSupabaseClient()
  let query = sb.from('facilitator_votes').select('*').eq('session_id', sessionId)
  if (nodeId) query = query.eq('node_id', nodeId)
  const { data, error } = await query

  if (error) return []
  return (data ?? []).map(rowToVote)
}

/** Finds this browser's own vote for a node, if any — used to show "you voted for X". */
export function findOwnVote(
  votes: FacilitatorVote[],
  participant: FacilitatorParticipant | null,
  nodeId: string
): FacilitatorVote | undefined {
  if (!participant) return undefined
  return votes.find(v => v.participantId === participant.id && v.nodeId === nodeId)
}
