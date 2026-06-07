-- BranchLab — Facilitator Mode
--
-- Live group-workshop sessions: a signed-in creator ("host") runs a published
-- scenario for a room of anonymous participants who join via a short code or
-- link from their phones, watch each scene, and vote on which choice to take.
-- The HOST — not the vote tally — decides which path the group actually takes;
-- the majority is shown for context only. See Step 1 of the spec for the full
-- product description.
--
-- Trust model (mirrors player_sessions/player_events from 002 + 011):
--   - facilitator_sessions: host-owned writes (host_user_id = auth.uid()),
--     public read — same "public read, owner write" shape as
--     scenario_versions (001). Public read is required so anonymous
--     participants can render the room AND so a join attempt against an
--     ended session can be told "this session has ended" rather than a
--     generic "not found" (getSupabaseServer runs as the anon role, so an
--     owner-only read policy would make ended sessions invisible to the very
--     /api/facilitator/join check that needs to report them). The row
--     contains no participant-identifying data — decision_log/visited_node_ids
--     are scenario node ids and choice labels already public on /play.
--   - facilitator_session_events: host-owned read (this is the session's
--     internal audit trail, not something participants need).
--   - facilitator_participants / facilitator_votes: anonymous participants
--     have no Supabase auth session, so these use permissive RLS (USING true /
--     WITH CHECK true) as a DB-level backstop. The actual "you can only act as
--     your own participant record" enforcement happens server-side in the
--     /api/facilitator/join and /api/facilitator/vote route handlers, which
--     resolve the canonical participant id from (session_id, anonymous_id)
--     rather than trusting a client-supplied id — the same pattern used by
--     /api/analytics/event.

-- ── facilitator_sessions ──────────────────────────────────────────────────────

create table if not exists public.facilitator_sessions (
  id                   uuid        primary key default gen_random_uuid(),
  host_user_id         uuid        not null references auth.users(id) on delete cascade,
  scenario_id          text        not null references public.scenarios(id) on delete cascade,
  scenario_version_id  text        not null references public.scenario_versions(id) on delete cascade,
  join_code            text        not null unique,
  status               text        not null default 'waiting'
                                   check (status in ('waiting', 'live', 'ended')),
  current_node_id      text,
  phase                text        not null default 'showing_scene'
                                   check (phase in ('showing_scene', 'voting_open', 'results_revealed', 'discussing', 'ended')),
  voting_opened_at     timestamptz,
  results_revealed_at  timestamptz,
  chosen_choice_id     text,
  visited_node_ids     jsonb       not null default '[]',
  decision_log         jsonb       not null default '[]',
  started_at           timestamptz,
  ended_at             timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists facilitator_sessions_join_code_idx           on public.facilitator_sessions(join_code);
create index if not exists facilitator_sessions_host_user_id_idx        on public.facilitator_sessions(host_user_id);
create index if not exists facilitator_sessions_scenario_version_id_idx on public.facilitator_sessions(scenario_version_id);

drop trigger if exists facilitator_sessions_updated_at on public.facilitator_sessions;
create trigger facilitator_sessions_updated_at
  before update on public.facilitator_sessions
  for each row execute function public.handle_updated_at();

-- ── facilitator_participants ─────────────────────────────────────────────────

create table if not exists public.facilitator_participants (
  id            uuid        primary key default gen_random_uuid(),
  session_id    uuid        not null references public.facilitator_sessions(id) on delete cascade,
  anonymous_id  text        not null,
  display_name  text,
  joined_at     timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),

  unique (session_id, anonymous_id)
);

create index if not exists facilitator_participants_session_id_idx on public.facilitator_participants(session_id);

-- ── facilitator_votes ────────────────────────────────────────────────────────

create table if not exists public.facilitator_votes (
  id              uuid        primary key default gen_random_uuid(),
  session_id      uuid        not null references public.facilitator_sessions(id) on delete cascade,
  participant_id  uuid        not null references public.facilitator_participants(id) on delete cascade,
  node_id         text        not null,
  choice_id       text        not null,
  created_at      timestamptz not null default now(),

  -- one vote per participant per node — refresh-safe (re-submitting the same
  -- vote is a no-op; voting after a result reveal is rejected server-side)
  unique (session_id, participant_id, node_id)
);

create index if not exists facilitator_votes_session_id_idx on public.facilitator_votes(session_id);
create index if not exists facilitator_votes_node_id_idx    on public.facilitator_votes(node_id);

-- ── facilitator_session_events ───────────────────────────────────────────────

create table if not exists public.facilitator_session_events (
  id          uuid        primary key default gen_random_uuid(),
  session_id  uuid        not null references public.facilitator_sessions(id) on delete cascade,
  event_type  text        not null check (
    event_type in (
      'session_created',
      'session_started',
      'participant_joined',
      'scene_shown',
      'voting_opened',
      'voting_closed',
      'results_revealed',
      'choice_made',
      'discussion_started',
      'session_ended'
    )
  ),
  node_id     text,
  choice_id   text,
  metadata    jsonb       not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists facilitator_session_events_session_id_idx on public.facilitator_session_events(session_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.facilitator_sessions       enable row level security;
alter table public.facilitator_participants   enable row level security;
alter table public.facilitator_votes          enable row level security;
alter table public.facilitator_session_events enable row level security;

-- facilitator_sessions: public read (mirrors scenario_versions), host-only write
drop policy if exists "host or live select" on public.facilitator_sessions;
drop policy if exists "public read" on public.facilitator_sessions;
create policy "public read" on public.facilitator_sessions
  for select using (true);

drop policy if exists "host insert" on public.facilitator_sessions;
create policy "host insert" on public.facilitator_sessions
  for insert with check (host_user_id = auth.uid());

drop policy if exists "host update" on public.facilitator_sessions;
create policy "host update" on public.facilitator_sessions
  for update using (host_user_id = auth.uid()) with check (host_user_id = auth.uid());

drop policy if exists "host delete" on public.facilitator_sessions;
create policy "host delete" on public.facilitator_sessions
  for delete using (host_user_id = auth.uid());

-- facilitator_participants: anonymous joiners have no auth session, so reads
-- and writes are permissive at the DB layer; /api/facilitator/join is the
-- actual gatekeeper (validates the join code + session status server-side)
drop policy if exists "public select" on public.facilitator_participants;
create policy "public select" on public.facilitator_participants
  for select using (true);

drop policy if exists "public insert" on public.facilitator_participants;
create policy "public insert" on public.facilitator_participants
  for insert with check (true);

drop policy if exists "public update" on public.facilitator_participants;
create policy "public update" on public.facilitator_participants
  for update using (true) with check (true);

-- facilitator_votes: same anonymous trust model — /api/facilitator/vote
-- resolves the canonical participant id server-side rather than trusting the
-- client, and the unique (session_id, participant_id, node_id) constraint
-- makes resubmission idempotent
drop policy if exists "public select" on public.facilitator_votes;
create policy "public select" on public.facilitator_votes
  for select using (true);

drop policy if exists "public insert" on public.facilitator_votes;
create policy "public insert" on public.facilitator_votes
  for insert with check (true);

-- facilitator_session_events: anyone can append (host actions + participant
-- joins both write events), only the host can read the room's event log
drop policy if exists "public insert" on public.facilitator_session_events;
create policy "public insert" on public.facilitator_session_events
  for insert with check (true);

drop policy if exists "host select" on public.facilitator_session_events;
create policy "host select" on public.facilitator_session_events
  for select using (
    exists (
      select 1
      from public.facilitator_sessions fs
      where fs.id = facilitator_session_events.session_id
        and fs.host_user_id = auth.uid()
    )
  );
