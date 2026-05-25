-- BranchLab — initial schema
-- Run this in Supabase SQL Editor: https://app.supabase.com → SQL Editor

-- ── scenarios (draft editor state) ──────────────────────────────────────────

create table if not exists public.scenarios (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        references auth.users(id) on delete cascade not null,
  title            text        not null default 'Untitled Scenario',
  slug             text        not null default '',
  description      text        not null default '',
  status           text        not null default 'draft'
                               check (status in ('draft', 'published', 'archived')),
  nodes            jsonb       not null default '[]',
  edges            jsonb       not null default '[]',
  start_node_id    text        not null default '',
  thumbnail_url    text,
  published_version jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists scenarios_user_id_idx on public.scenarios(user_id);
create index if not exists scenarios_status_idx  on public.scenarios(status);

-- ── scenario_versions (immutable published snapshots) ────────────────────────

create table if not exists public.scenario_versions (
  id             uuid        primary key default gen_random_uuid(),
  scenario_id    uuid        references public.scenarios(id) on delete cascade not null,
  user_id        uuid        references auth.users(id) on delete cascade not null,
  version        integer     not null default 1,
  title          text        not null default '',
  nodes          jsonb       not null default '[]',
  edges          jsonb       not null default '[]',
  start_node_id  text        not null default '',
  slug           text        not null unique,
  published_at   timestamptz not null default now()
);

create index if not exists scenario_versions_slug_idx        on public.scenario_versions(slug);
create index if not exists scenario_versions_scenario_id_idx on public.scenario_versions(scenario_id);

-- ── clips ────────────────────────────────────────────────────────────────────

create table if not exists public.clips (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references auth.users(id) on delete cascade not null,
  name          text        not null,
  size          bigint      not null,
  mime_type     text        not null,
  url           text        not null,
  storage_path  text        not null,
  thumbnail_url text,
  duration      integer     not null default 0,
  created_at    timestamptz not null default now()
);

-- If the clips table already exists without thumbnail_url, run:
-- alter table public.clips add column if not exists thumbnail_url text;

create index if not exists clips_user_id_idx on public.clips(user_id);

-- ── updated_at trigger ───────────────────────────────────────────────────────

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists scenarios_updated_at on public.scenarios;
create trigger scenarios_updated_at
  before update on public.scenarios
  for each row execute function public.handle_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.scenarios enable row level security;
alter table public.scenario_versions enable row level security;
alter table public.clips enable row level security;

-- scenarios: owner only
drop policy if exists "owner select" on public.scenarios;
create policy "owner select" on public.scenarios
  for select using (auth.uid() = user_id);

drop policy if exists "owner insert" on public.scenarios;
create policy "owner insert" on public.scenarios
  for insert with check (auth.uid() = user_id);

drop policy if exists "owner update" on public.scenarios;
create policy "owner update" on public.scenarios
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner delete" on public.scenarios;
create policy "owner delete" on public.scenarios
  for delete using (auth.uid() = user_id);

-- scenario_versions: public read, owner write
drop policy if exists "public read" on public.scenario_versions;
create policy "public read" on public.scenario_versions
  for select using (true);

drop policy if exists "owner insert" on public.scenario_versions;
create policy "owner insert" on public.scenario_versions
  for insert with check (auth.uid() = user_id);

drop policy if exists "owner update" on public.scenario_versions;
create policy "owner update" on public.scenario_versions
  for update using (auth.uid() = user_id);

-- clips: owner only
drop policy if exists "owner select" on public.clips;
create policy "owner select" on public.clips
  for select using (auth.uid() = user_id);

drop policy if exists "owner insert" on public.clips;
create policy "owner insert" on public.clips
  for insert with check (auth.uid() = user_id);

drop policy if exists "owner delete" on public.clips;
create policy "owner delete" on public.clips
  for delete using (auth.uid() = user_id);

-- ── Storage bucket RLS (run after creating the "Assets" bucket) ──────────────
-- Bucket name: Assets (must be created manually in Storage dashboard)

-- Anyone can read (published video URLs must be publicly accessible)
drop policy if exists "public read" on storage.objects;
create policy "public read"
  on storage.objects for select
  using (bucket_id = 'Assets');

-- Authenticated users can upload only to their own folder ({user_id}/...)
drop policy if exists "owner insert" on storage.objects;
create policy "owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'Assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "owner delete" on storage.objects;
create policy "owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'Assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
