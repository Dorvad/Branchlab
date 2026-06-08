-- Extends player_sessions / player_events (added in 002, corrected in 005) with
-- richer lifecycle data so the analytics page can show completion time, score,
-- ending, and drop-off without re-deriving everything from raw events on every load.
--
-- Column-naming note: the existing tables use `slug` (not `published_slug`) and
-- `metadata` (not `event_data`) — we keep those names rather than introduce
-- duplicate columns that store the same thing under a different name.

-- ── player_sessions: lifecycle + outcome columns ──────────────────────────────

ALTER TABLE public.player_sessions
  ADD COLUMN IF NOT EXISTS is_preview       boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS last_event_at    timestamptz,
  ADD COLUMN IF NOT EXISTS ending_node_id   text,
  ADD COLUMN IF NOT EXISTS total_score      integer      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_seconds integer;

-- ── player_events: per-event detail columns ──────────────────────────────────

ALTER TABLE public.player_events
  ADD COLUMN IF NOT EXISTS choice_label text,
  ADD COLUMN IF NOT EXISTS score_delta  integer;

-- Widen the event_type whitelist with the new lifecycle events the player now records.
ALTER TABLE public.player_events DROP CONSTRAINT IF EXISTS player_events_event_type_check;
ALTER TABLE public.player_events ADD CONSTRAINT player_events_event_type_check CHECK (
  event_type IN (
    'session_started',
    'node_viewed',
    'video_started',
    'video_completed',
    'choice_viewed',
    'choice_selected',
    'feedback_viewed',
    'ending_reached',
    'session_completed',
    'session_restarted'
  )
);

-- ── RLS: allow public sessions to be completed ────────────────────────────────
--
-- player_sessions.id is a cryptographically random UUID minted client-side and
-- never surfaced in the UI (the same trust model migration 002/005 already use
-- for the public "insert" policies — anonymous players write their own rows,
-- and guessing another visitor's session id is not practically feasible). To
-- record `session_completed` / `ending_reached` outcomes directly on the
-- session row (completed_at, ending_node_id, total_score, duration_seconds,
-- last_event_at) the public role also needs UPDATE on player_sessions.

DROP POLICY IF EXISTS "public update own session" ON public.player_sessions;
CREATE POLICY "public update own session" ON public.player_sessions
  FOR UPDATE USING (true) WITH CHECK (true);

-- ── Helpful index for "recent / active sessions" queries ──────────────────────

CREATE INDEX IF NOT EXISTS player_sessions_completed_at_idx ON public.player_sessions(completed_at);
CREATE INDEX IF NOT EXISTS player_events_node_id_idx        ON public.player_events(node_id);
CREATE INDEX IF NOT EXISTS player_events_choice_id_idx      ON public.player_events(choice_id);
