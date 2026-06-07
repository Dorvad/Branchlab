// POST /api/facilitator/join
//
// Anonymous participants have no Supabase auth session, so this route is the
// actual gatekeeper for joining a room: it validates the join code, checks
// the session is joinable, and creates (or reuses, on refresh) the canonical
// participant row keyed off (session_id, anonymous_id) — never trusting a
// client-supplied participant id. Mirrors /api/analytics/event's "resolve the
// canonical id server-side" pattern.

import { getSupabaseServer } from '@/lib/supabase/server'
import { parseJoin } from '@/lib/facilitator/validate'
import { rowToParticipant, rowToSession } from '@/lib/facilitator/rows'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const payload = parseJoin(body)
  if (!payload) return Response.json({ error: 'Invalid payload' }, { status: 400 })

  const sb = getSupabaseServer()

  const { data: sessionRow, error: sessionError } = await sb
    .from('facilitator_sessions')
    .select('*')
    .eq('join_code', payload.joinCode)
    .maybeSingle()

  if (sessionError || !sessionRow) {
    return Response.json({ error: 'No session found for that code' }, { status: 404 })
  }

  const session = rowToSession(sessionRow)
  if (session.status === 'ended') {
    return Response.json({ error: 'This session has ended' }, { status: 410 })
  }

  // Idempotent / refresh-safe: re-joining returns the same participant row.
  const { data: existing } = await sb
    .from('facilitator_participants')
    .select('*')
    .eq('session_id', session.id)
    .eq('anonymous_id', payload.anonymousId)
    .maybeSingle()

  const existingRow = existing as { id: string; display_name: string | null } | null

  let participantRow: Record<string, unknown> | null = existingRow
  if (!existingRow) {
    const { data: inserted, error: insertError } = await sb
      .from('facilitator_participants')
      .insert({
        session_id: session.id,
        anonymous_id: payload.anonymousId,
        display_name: payload.displayName ?? null,
      })
      .select()
      .single()

    if (insertError || !inserted) {
      return Response.json({ error: 'Failed to join session' }, { status: 500 })
    }
    participantRow = inserted

    await sb.from('facilitator_session_events').insert({
      session_id: session.id,
      event_type: 'participant_joined',
      metadata: { displayName: payload.displayName ?? null },
    })
  } else if (payload.displayName && payload.displayName !== existingRow.display_name) {
    // Allow updating a display name on rejoin (e.g. typo fix)
    const { data: updated } = await sb
      .from('facilitator_participants')
      .update({ display_name: payload.displayName, last_seen_at: new Date().toISOString() })
      .eq('id', existingRow.id)
      .select()
      .single()
    participantRow = updated ?? existingRow
  } else {
    await sb
      .from('facilitator_participants')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', existingRow.id)
  }

  return Response.json({
    ok: true,
    participant: rowToParticipant(participantRow),
    session: { id: session.id, status: session.status, joinCode: session.joinCode },
  })
}
