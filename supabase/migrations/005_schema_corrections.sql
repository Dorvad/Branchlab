-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  BranchLab — Schema Correction Script                                   ║
-- ║  Run in Supabase SQL Editor (single pass, safe to re-run)               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ────────────────────────────────────────────────────────────────────────────
-- PART A: Fix player_sessions / player_events
-- ────────────────────────────────────────────────────────────────────────────
-- Migration 002 declared scenario_version_id / scenario_id as TEXT, but
-- the referenced columns (scenario_versions.id, scenarios.id) are UUID.
-- PostgreSQL rejects FK constraints across incompatible types, so these
-- tables were never created. Drop any partial state and recreate correctly.

DROP TABLE IF EXISTS public.player_events  CASCADE;
DROP TABLE IF EXISTS public.player_sessions CASCADE;

CREATE TABLE public.player_sessions (
  id                   uuid        PRIMARY KEY,
  scenario_version_id  uuid        NOT NULL REFERENCES public.scenario_versions(id) ON DELETE CASCADE,
  scenario_id          uuid        NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  slug                 text        NOT NULL,
  visitor_id           text,
  started_at           timestamptz NOT NULL DEFAULT now(),
  user_agent           text,
  referrer             text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS player_sessions_scenario_id_idx
  ON public.player_sessions(scenario_id);
CREATE INDEX IF NOT EXISTS player_sessions_scenario_version_id_idx
  ON public.player_sessions(scenario_version_id);
CREATE INDEX IF NOT EXISTS player_sessions_started_at_idx
  ON public.player_sessions(started_at);

CREATE TABLE public.player_events (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           uuid        NOT NULL REFERENCES public.player_sessions(id) ON DELETE CASCADE,
  scenario_version_id  uuid        NOT NULL REFERENCES public.scenario_versions(id) ON DELETE CASCADE,
  scenario_id          uuid        NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  event_type           text        NOT NULL CHECK (event_type IN (
    'session_started', 'node_viewed', 'choice_selected',
    'feedback_viewed', 'ending_reached', 'session_completed'
  )),
  node_id              text,
  choice_id            text,
  target_node_id       text,
  ending_node_id       text,
  score                jsonb,
  metadata             jsonb NOT NULL DEFAULT '{}',
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS player_events_session_id_idx
  ON public.player_events(session_id);
CREATE INDEX IF NOT EXISTS player_events_scenario_id_idx
  ON public.player_events(scenario_id);
CREATE INDEX IF NOT EXISTS player_events_scenario_version_id_idx
  ON public.player_events(scenario_version_id);
CREATE INDEX IF NOT EXISTS player_events_event_type_idx
  ON public.player_events(event_type);
CREATE INDEX IF NOT EXISTS player_events_created_at_idx
  ON public.player_events(created_at);

ALTER TABLE public.player_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_events   ENABLE ROW LEVEL SECURITY;

-- Public players can insert sessions/events anonymously
DROP POLICY IF EXISTS "public insert" ON public.player_sessions;
CREATE POLICY "public insert" ON public.player_sessions
  FOR INSERT WITH CHECK (true);

-- Only the scenario owner can read analytics
DROP POLICY IF EXISTS "owner select" ON public.player_sessions;
CREATE POLICY "owner select" ON public.player_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scenario_versions sv
      WHERE sv.id = player_sessions.scenario_version_id
        AND sv.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "public insert" ON public.player_events;
CREATE POLICY "public insert" ON public.player_events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "owner select" ON public.player_events;
CREATE POLICY "owner select" ON public.player_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scenario_versions sv
      WHERE sv.id = player_events.scenario_version_id
        AND sv.user_id = auth.uid()
    )
  );


-- ────────────────────────────────────────────────────────────────────────────
-- PART B: Fix youtube_assets
-- ────────────────────────────────────────────────────────────────────────────
-- Issues in migration 004:
--   1. Missing public. schema prefix
--   2. org_id declared as TEXT instead of UUID
--   3. No user_id column (needed to scope personal assets and enforce RLS)
--   4. No RLS at all
--   5. COALESCE(org_id, '') uniqueness trick does not work with UUID type
--
-- The companion code fix (youtube-assets.ts) now passes user_id on insert.

DROP TABLE IF EXISTS public.youtube_assets CASCADE;

CREATE TABLE public.youtube_assets (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id           uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  youtube_video_id text        NOT NULL,
  original_url     text        NOT NULL,
  title            text,
  thumbnail_url    text,
  duration         float,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS youtube_assets_user_id_idx ON public.youtube_assets(user_id);
CREATE INDEX IF NOT EXISTS youtube_assets_org_id_idx  ON public.youtube_assets(org_id);

-- Nullable-UUID uniqueness: two partial indexes (works in all Postgres versions)
CREATE UNIQUE INDEX IF NOT EXISTS youtube_assets_unique_per_org
  ON public.youtube_assets(org_id, youtube_video_id)
  WHERE org_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS youtube_assets_unique_no_org
  ON public.youtube_assets(user_id, youtube_video_id)
  WHERE org_id IS NULL;

ALTER TABLE public.youtube_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member select" ON public.youtube_assets;
CREATE POLICY "member select" ON public.youtube_assets FOR SELECT USING (
  (org_id IS NULL AND auth.uid() = user_id)
  OR (org_id IS NOT NULL AND public.is_org_member(org_id, 'viewer'))
);

DROP POLICY IF EXISTS "member insert" ON public.youtube_assets;
CREATE POLICY "member insert" ON public.youtube_assets FOR INSERT WITH CHECK (
  (org_id IS NULL AND auth.uid() = user_id)
  OR (org_id IS NOT NULL AND public.is_org_member(org_id, 'member'))
);

DROP POLICY IF EXISTS "member update" ON public.youtube_assets;
CREATE POLICY "member update" ON public.youtube_assets FOR UPDATE
  USING (
    (org_id IS NULL AND auth.uid() = user_id)
    OR (org_id IS NOT NULL AND public.is_org_member(org_id, 'member'))
  )
  WITH CHECK (
    (org_id IS NULL AND auth.uid() = user_id)
    OR (org_id IS NOT NULL AND public.is_org_member(org_id, 'member'))
  );

DROP POLICY IF EXISTS "member delete" ON public.youtube_assets;
CREATE POLICY "member delete" ON public.youtube_assets FOR DELETE USING (
  (org_id IS NULL AND auth.uid() = user_id)
  OR (org_id IS NOT NULL AND public.is_org_member(org_id, 'admin'))
);


-- ────────────────────────────────────────────────────────────────────────────
-- PART C: Add scenario_id to clips
-- ────────────────────────────────────────────────────────────────────────────
-- clip-repository.ts (used in supabase mode) inserts scenario_id and queries
-- WHERE scenario_id = ?, but no migration ever added this column to clips.
-- Without it, every Supabase-mode clip upload and list fails at the DB level.

ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS scenario_id uuid
    REFERENCES public.scenarios(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS clips_scenario_id_idx ON public.clips(scenario_id);


-- ────────────────────────────────────────────────────────────────────────────
-- PART D: Add missing UPDATE policy on clips
-- ────────────────────────────────────────────────────────────────────────────
-- renameClip() does UPDATE clips SET name = ? WHERE id = ?
-- Neither 001_initial_schema.sql nor 003_organizations.sql adds an UPDATE
-- policy, so RLS silently blocks every rename in Supabase mode.

DROP POLICY IF EXISTS "member update" ON public.clips;
CREATE POLICY "member update" ON public.clips FOR UPDATE
  USING (
    (org_id IS NULL AND auth.uid() = user_id)
    OR (org_id IS NOT NULL AND public.is_org_member(org_id, 'member'))
  )
  WITH CHECK (
    (org_id IS NULL AND auth.uid() = user_id)
    OR (org_id IS NOT NULL AND public.is_org_member(org_id, 'member'))
  );


-- ────────────────────────────────────────────────────────────────────────────
-- PART E: Storage policies for branchlab-clips bucket
-- ────────────────────────────────────────────────────────────────────────────
-- clip-repository.ts uploads to a separate 'branchlab-clips' bucket.
-- The existing storage policies in 001_initial_schema.sql only cover 'Assets'.
--
-- PREREQUISITE: Create the 'branchlab-clips' bucket in Supabase Storage
-- dashboard (Storage → New bucket → Name: branchlab-clips → Public: off)
-- before running these policies.

DROP POLICY IF EXISTS "branchlab-clips public read"  ON storage.objects;
DROP POLICY IF EXISTS "branchlab-clips owner insert" ON storage.objects;
DROP POLICY IF EXISTS "branchlab-clips owner delete" ON storage.objects;

CREATE POLICY "branchlab-clips public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'branchlab-clips');

-- Path format: {user_id}/{scenario_id}/{clip_id}-{filename}
-- The first folder segment is user_id, same as the Assets bucket convention.
CREATE POLICY "branchlab-clips owner insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'branchlab-clips'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "branchlab-clips owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'branchlab-clips'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
