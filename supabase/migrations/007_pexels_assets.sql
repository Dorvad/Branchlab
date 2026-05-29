-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  BranchLab — Pexels Assets                                              ║
-- ║  Run in Supabase SQL Editor (single pass, safe to re-run)               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.pexels_assets (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id           uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  pexels_id        bigint      NOT NULL,
  type             text        NOT NULL CHECK (type IN ('video','photo')),
  title            text        NOT NULL,
  url              text        NOT NULL,
  thumbnail_url    text        NOT NULL,
  width            integer     NOT NULL DEFAULT 0,
  height           integer     NOT NULL DEFAULT 0,
  duration         float,
  photographer     text        NOT NULL DEFAULT '',
  pexels_page_url  text        NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Partial unique indexes (same pattern as youtube_assets)
CREATE UNIQUE INDEX IF NOT EXISTS pexels_assets_unique_per_org
  ON public.pexels_assets(org_id, pexels_id, type)
  WHERE org_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pexels_assets_unique_no_org
  ON public.pexels_assets(user_id, pexels_id, type)
  WHERE org_id IS NULL;

CREATE INDEX IF NOT EXISTS pexels_assets_user_id_idx
  ON public.pexels_assets(user_id);

ALTER TABLE public.pexels_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "self select" ON public.pexels_assets;
CREATE POLICY "self select" ON public.pexels_assets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "self insert" ON public.pexels_assets;
CREATE POLICY "self insert" ON public.pexels_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "self update" ON public.pexels_assets;
CREATE POLICY "self update" ON public.pexels_assets
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "self delete" ON public.pexels_assets;
CREATE POLICY "self delete" ON public.pexels_assets
  FOR DELETE USING (auth.uid() = user_id);
