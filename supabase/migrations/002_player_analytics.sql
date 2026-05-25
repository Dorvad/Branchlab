-- BranchLab — player analytics
-- Run this in Supabase SQL Editor after 001_initial_schema.sql

-- ── player_sessions ───────────────────────────────────────────────────────────

create table if not exists public.player_sessions (
  id                   uuid        primary key,
  scenario_version_id  text        not null references public.scenario_versions(id) on delete cascade,
  scenario_id          uuid        not null references public.scenarios(id) on delete cascade,
  slug                 text        not null,
  visitor_id           text,
  started_at           timestamptz not null default now(),
  user_agent           text,
  referrer             text,
  created_at           timestamptz not null default now()
);

create index if not exists player_sessions_scenario_id_idx         on public.player_sessions(scenario_id);
create index if not exists player_sessions_scenario_version_id_idx on public.player_sessions(scenario_version_id);
create index if not exists player_sessions_started_at_idx          on public.player_sessions(started_at);

-- ── player_events ─────────────────────────────────────────────────────────────

create table if not exists public.player_events (
  id                   uuid        primary key default gen_random_uuid(),
  session_id           uuid        not null references public.player_sessions(id) on delete cascade,
  scenario_version_id  text        not null references public.scenario_versions(id) on delete cascade,
  scenario_id          uuid        not null references public.scenarios(id) on delete cascade,
  event_type           text        not null check (
    event_type in (
      'session_started',
      'node_viewed',
      'choice_selected',
      'feedback_viewed',
      'ending_reached',
      'session_completed'
    )
  ),
  node_id              text,
  choice_id            text,
  target_node_id       text,
  ending_node_id       text,
  score                jsonb,
  metadata             jsonb not null default '{}',
  created_at           timestamptz not null default now()
);

create index if not exists player_events_session_id_idx            on public.player_events(session_id);
create index if not exists player_events_scenario_id_idx           on public.player_events(scenario_id);
create index if not exists player_events_scenario_version_id_idx   on public.player_events(scenario_version_id);
create index if not exists player_events_event_type_idx            on public.player_events(event_type);
create index if not exists player_events_created_at_idx            on public.player_events(created_at);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.player_sessions enable row level security;
alter table public.player_events   enable row level security;

-- player_sessions: anyone can insert (anonymous public players)
drop policy if exists "public insert" on public.player_sessions;
create policy "public insert" on public.player_sessions
  for insert with check (true);

-- player_sessions: only the scenario owner can read
drop policy if exists "owner select" on public.player_sessions;
create policy "owner select" on public.player_sessions
  for select using (
    exists (
      select 1
      from public.scenario_versions sv
      where sv.id = player_sessions.scenario_version_id
        and sv.user_id = auth.uid()
    )
  );

-- player_events: anyone can insert
drop policy if exists "public insert" on public.player_events;
create policy "public insert" on public.player_events
  for insert with check (true);

-- player_events: only the scenario owner can read
drop policy if exists "owner select" on public.player_events;
create policy "owner select" on public.player_events
  for select using (
    exists (
      select 1
      from public.scenario_versions sv
      where sv.id = player_events.scenario_version_id
        and sv.user_id = auth.uid()
    )
  );
