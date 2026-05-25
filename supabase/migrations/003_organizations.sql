-- BranchLab — Organizations, Workspaces & Project Ownership
-- Run in Supabase SQL Editor after 001_initial_schema.sql and 002_player_analytics.sql

-- ── organizations ─────────────────────────────────────────────────────────────
-- NOTE: tables are created before is_org_member() because PostgreSQL validates
-- LANGUAGE SQL function bodies at creation time and will error if the referenced
-- table doesn't exist yet.

create table if not exists public.organizations (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  slug        text        not null unique,
  created_by  uuid        references auth.users(id) on delete set null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function public.handle_updated_at();

-- ── organization_members ──────────────────────────────────────────────────────

create table if not exists public.organization_members (
  id        uuid        primary key default gen_random_uuid(),
  org_id    uuid        not null references public.organizations(id) on delete cascade,
  user_id   uuid        not null references auth.users(id) on delete cascade,
  role      text        not null default 'member'
            check (role in ('owner','admin','member','viewer')),
  joined_at timestamptz not null default now(),
  unique(org_id, user_id)
);

create index if not exists org_members_user_id_idx on public.organization_members(user_id);
create index if not exists org_members_org_id_idx  on public.organization_members(org_id);

-- ── Helper function (after organization_members so the table reference resolves) ──

create or replace function public.is_org_member(org uuid, min_role text default 'viewer')
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.organization_members
    where org_id = org
      and user_id = auth.uid()
      and case min_role
        when 'viewer' then role in ('viewer','member','admin','owner')
        when 'member' then role in ('member','admin','owner')
        when 'admin'  then role in ('admin','owner')
        when 'owner'  then role = 'owner'
        else false
      end
  )
$$;

-- ── organization_invites ──────────────────────────────────────────────────────

create table if not exists public.organization_invites (
  id          uuid        primary key default gen_random_uuid(),
  org_id      uuid        not null references public.organizations(id) on delete cascade,
  email       text        not null,
  role        text        not null default 'member'
              check (role in ('admin','member','viewer')),
  token       text        not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by  uuid        references auth.users(id) on delete set null,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  unique(org_id, email)
);

create index if not exists org_invites_token_idx  on public.organization_invites(token);
create index if not exists org_invites_org_id_idx on public.organization_invites(org_id);

-- ── Extend existing tables with org_id ───────────────────────────────────────

alter table public.scenarios
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;

alter table public.clips
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;

create index if not exists scenarios_org_id_idx on public.scenarios(org_id);
create index if not exists clips_org_id_idx     on public.clips(org_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invites enable row level security;

-- organizations: any member can read; owner/admin can update; authenticated can insert (create new org)
drop policy if exists "member read"  on public.organizations;
create policy "member read" on public.organizations for select
  using (public.is_org_member(id, 'viewer'));

drop policy if exists "authenticated insert" on public.organizations;
create policy "authenticated insert" on public.organizations for insert
  with check (auth.uid() is not null);

drop policy if exists "admin update" on public.organizations;
create policy "admin update" on public.organizations for update
  using (public.is_org_member(id, 'admin'))
  with check (public.is_org_member(id, 'admin'));

drop policy if exists "owner delete" on public.organizations;
create policy "owner delete" on public.organizations for delete
  using (public.is_org_member(id, 'owner'));

-- organization_members: members can read their own org's member list
drop policy if exists "member read" on public.organization_members;
create policy "member read" on public.organization_members for select
  using (public.is_org_member(org_id, 'viewer'));

drop policy if exists "self or admin insert" on public.organization_members;
create policy "self or admin insert" on public.organization_members for insert
  with check (public.is_org_member(org_id, 'admin') or auth.uid() = user_id);

drop policy if exists "admin update" on public.organization_members;
create policy "admin update" on public.organization_members for update
  using (public.is_org_member(org_id, 'admin'));

drop policy if exists "admin delete" on public.organization_members;
create policy "admin delete" on public.organization_members for delete
  using (
    public.is_org_member(org_id, 'admin')
    or auth.uid() = user_id  -- members can leave on their own
  );

-- organization_invites: admin can manage; anyone can read by token (for accept flow)
drop policy if exists "admin manage" on public.organization_invites;
create policy "admin manage" on public.organization_invites for all
  using (public.is_org_member(org_id, 'admin'))
  with check (public.is_org_member(org_id, 'admin'));

drop policy if exists "token read" on public.organization_invites;
create policy "token read" on public.organization_invites for select
  using (true);  -- token is a secret; anyone with the link can read the invite to accept it

-- ── Updated RLS for scenarios (add org access) ────────────────────────────────

drop policy if exists "owner select" on public.scenarios;
create policy "member select" on public.scenarios for select
  using (
    (org_id is null and auth.uid() = user_id)
    or (org_id is not null and public.is_org_member(org_id, 'viewer'))
  );

drop policy if exists "owner insert" on public.scenarios;
create policy "member insert" on public.scenarios for insert
  with check (
    (org_id is null and auth.uid() = user_id)
    or (org_id is not null and public.is_org_member(org_id, 'member'))
  );

drop policy if exists "owner update" on public.scenarios;
create policy "member update" on public.scenarios for update
  using (
    (org_id is null and auth.uid() = user_id)
    or (org_id is not null and public.is_org_member(org_id, 'member'))
  )
  with check (
    (org_id is null and auth.uid() = user_id)
    or (org_id is not null and public.is_org_member(org_id, 'member'))
  );

drop policy if exists "owner delete" on public.scenarios;
create policy "admin delete" on public.scenarios for delete
  using (
    (org_id is null and auth.uid() = user_id)
    or (org_id is not null and public.is_org_member(org_id, 'admin'))
  );

-- ── Updated RLS for clips (add org access) ────────────────────────────────────

drop policy if exists "owner select" on public.clips;
create policy "member select" on public.clips for select
  using (
    (org_id is null and auth.uid() = user_id)
    or (org_id is not null and public.is_org_member(org_id, 'viewer'))
  );

drop policy if exists "owner insert" on public.clips;
create policy "member insert" on public.clips for insert
  with check (
    (org_id is null and auth.uid() = user_id)
    or (org_id is not null and public.is_org_member(org_id, 'member'))
  );

drop policy if exists "owner delete" on public.clips;
create policy "admin delete" on public.clips for delete
  using (
    (org_id is null and auth.uid() = user_id)
    or (org_id is not null and public.is_org_member(org_id, 'admin'))
  );
