-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  BranchLab — Coverr Assets                                              ║
-- ║  Run in Supabase SQL Editor (single pass, safe to re-run)               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.coverr_assets (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id         uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  coverr_id      text        NOT NULL,
  title          text        NOT NULL,
  url            text        NOT NULL,
  thumbnail_url  text        NOT NULL,
  width          integer     NOT NULL DEFAULT 0,
  height         integer     NOT NULL DEFAULT 0,
  duration       float       NOT NULL DEFAULT 0,
  is_vertical    boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS coverr_assets_unique_per_org
  ON public.coverr_assets(org_id, coverr_id)
  WHERE org_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS coverr_assets_unique_no_org
  ON public.coverr_assets(user_id, coverr_id)
  WHERE org_id IS NULL;

CREATE INDEX IF NOT EXISTS coverr_assets_user_id_idx
  ON public.coverr_assets(user_id);

ALTER TABLE public.coverr_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "self select" ON public.coverr_assets;
CREATE POLICY "self select" ON public.coverr_assets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "self insert" ON public.coverr_assets;
CREATE POLICY "self insert" ON public.coverr_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "self update" ON public.coverr_assets;
CREATE POLICY "self update" ON public.coverr_assets
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "self delete" ON public.coverr_assets;
CREATE POLICY "self delete" ON public.coverr_assets
  FOR DELETE USING (auth.uid() = user_id);
