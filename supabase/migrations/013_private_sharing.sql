-- Private sharing & access control for published scenarios.
--
-- Replaces the dead/fake password feature added in migration 010
-- (scenario_versions.password_protected / .password were plaintext columns
-- that publishScenario() never wrote to and getPublishedBySlug() leaked
-- straight to the browser — there was no gate anywhere in the player).
--
-- This migration:
--   1. Adds real visibility/access columns to scenario_versions, hashing any
--      existing plaintext passwords in place with pgcrypto/bcrypt, then drops
--      the old plaintext columns.
--   2. Adds scenario_share_tokens for revocable share links.
--   3. Tightens scenario_versions' previously fully-open "public read" RLS
--      policy so password/private rows are no longer readable by anonymous
--      clients — the /play/[slug] route now gates access server-side via the
--      service-role client — while preserving owner access and the existing
--      Facilitator Mode flow (anonymous participants reading versions pinned
--      to an active facilitator session).

create extension if not exists pgcrypto;

-- ── scenario_versions: access columns ─────────────────────────────────────────

alter table public.scenario_versions
  add column if not exists visibility     text        not null default 'public',
  add column if not exists password_hash  text,
  add column if not exists access_enabled boolean     not null default true,
  add column if not exists updated_at     timestamptz not null default now();

alter table public.scenario_versions drop constraint if exists scenario_versions_visibility_check;
alter table public.scenario_versions
  add constraint scenario_versions_visibility_check
  check (visibility in ('public', 'unlisted', 'password', 'private'));

-- Migrate any pre-existing (fake) plaintext passwords into real bcrypt hashes
-- and mark those versions as password-protected.
-- Uses EXECUTE (dynamic SQL) so Postgres skips compile-time column validation;
-- the UPDATE only runs if migration 010's columns actually exist.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'scenario_versions'
      and column_name  = 'password_protected'
  ) then
    execute $sql$
      update public.scenario_versions
      set
        visibility    = 'password',
        password_hash = crypt(password, gen_salt('bf'))
      where password_protected is true
        and password is not null
        and password <> ''
    $sql$;
  end if;
end
$$;

alter table public.scenario_versions
  drop column if exists password_protected,
  drop column if exists password;

create index if not exists scenario_versions_slug_idx2       on public.scenario_versions(slug);
create index if not exists scenario_versions_visibility_idx  on public.scenario_versions(visibility);

drop trigger if exists scenario_versions_updated_at on public.scenario_versions;
create trigger scenario_versions_updated_at
  before update on public.scenario_versions
  for each row execute function public.handle_updated_at();

-- ── scenario_share_tokens ──────────────────────────────────────────────────────

create table if not exists public.scenario_share_tokens (
  id                   uuid        primary key default gen_random_uuid(),
  scenario_version_id  text        not null references public.scenario_versions(id) on delete cascade,
  scenario_id          text,
  token                text        unique not null,
  label                text,
  created_by           uuid        not null references auth.users(id) on delete cascade,
  created_at           timestamptz not null default now(),
  expires_at           timestamptz,
  revoked_at           timestamptz,
  last_used_at         timestamptz,
  use_count            integer     not null default 0
);

create index if not exists scenario_share_tokens_token_idx               on public.scenario_share_tokens(token);
create index if not exists scenario_share_tokens_scenario_version_id_idx on public.scenario_share_tokens(scenario_version_id);

alter table public.scenario_share_tokens enable row level security;

-- Owner-only: a token's owner is whoever owns the scenario_versions row it
-- points at (created_by doubles as a redundant check for defense in depth).
drop policy if exists "owner select" on public.scenario_share_tokens;
create policy "owner select" on public.scenario_share_tokens
  for select using (
    auth.uid() = created_by
    or exists (
      select 1 from public.scenario_versions sv
      where sv.id = scenario_share_tokens.scenario_version_id
        and sv.user_id = auth.uid()
    )
  );

drop policy if exists "owner insert" on public.scenario_share_tokens;
create policy "owner insert" on public.scenario_share_tokens
  for insert with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.scenario_versions sv
      where sv.id = scenario_share_tokens.scenario_version_id
        and sv.user_id = auth.uid()
    )
  );

drop policy if exists "owner update" on public.scenario_share_tokens;
create policy "owner update" on public.scenario_share_tokens
  for update using (
    auth.uid() = created_by
    or exists (
      select 1 from public.scenario_versions sv
      where sv.id = scenario_share_tokens.scenario_version_id
        and sv.user_id = auth.uid()
    )
  );

drop policy if exists "owner delete" on public.scenario_share_tokens;
create policy "owner delete" on public.scenario_share_tokens
  for delete using (
    auth.uid() = created_by
    or exists (
      select 1 from public.scenario_versions sv
      where sv.id = scenario_share_tokens.scenario_version_id
        and sv.user_id = auth.uid()
    )
  );

-- ── Tighten scenario_versions read access ─────────────────────────────────────
--
-- Previously "public read" returned every row to everyone — including
-- password_hash-bearing rows for password/private scenarios. Real access
-- control means the anon/browser client can only ever see:
--   - rows the requester owns (any visibility — the editor/dashboard need this)
--   - public/unlisted rows that haven't been disabled
--   - rows pinned to a still-active Facilitator session (existing feature —
--     anonymous participants read scenario_versions directly per
--     src/lib/facilitator/version.ts)
-- Password and private scenarios are served exclusively through
-- /api/play/[slug] style routes using the service-role client, which checks
-- the password / ownership itself before returning any scenario JSON.

drop policy if exists "public read" on public.scenario_versions;
drop policy if exists "scenario versions read" on public.scenario_versions;
create policy "scenario versions read" on public.scenario_versions
  for select using (
    auth.uid() = user_id
    or (
      coalesce(visibility, 'public') in ('public', 'unlisted')
      and coalesce(access_enabled, true) = true
    )
    or exists (
      select 1 from public.facilitator_sessions fs
      where fs.scenario_version_id = scenario_versions.id::text
        and fs.status <> 'ended'
    )
  );
