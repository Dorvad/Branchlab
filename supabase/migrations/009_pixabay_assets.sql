-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  BranchLab — Pixabay Assets                                             ║
-- ║  Run in Supabase SQL Editor (single pass, safe to re-run)               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.pixabay_assets (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id         uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  pixabay_id     bigint      NOT NULL,
  type           text        NOT NULL CHECK (type IN ('video','image')),
  title          text        NOT NULL,
  url            text        NOT NULL,
  thumbnail_url  text        NOT NULL,
  width          integer     NOT NULL DEFAULT 0,
  height         integer     NOT NULL DEFAULT 0,
  duration       float,
  "user"         text        NOT NULL DEFAULT '',
  page_url       text        NOT NULL DEFAULT '',
  image_type     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pixabay_assets_unique_per_org
  ON public.pixabay_assets(org_id, pixabay_id, type)
  WHERE org_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pixabay_assets_unique_no_org
  ON public.pixabay_assets(user_id, pixabay_id, type)
  WHERE org_id IS NULL;

CREATE INDEX IF NOT EXISTS pixabay_assets_user_id_idx
  ON public.pixabay_assets(user_id);

ALTER TABLE public.pixabay_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "self select" ON public.pixabay_assets;
CREATE POLICY "self select" ON public.pixabay_assets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "self insert" ON public.pixabay_assets;
CREATE POLICY "self insert" ON public.pixabay_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "self update" ON public.pixabay_assets;
CREATE POLICY "self update" ON public.pixabay_assets
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "self delete" ON public.pixabay_assets;
CREATE POLICY "self delete" ON public.pixabay_assets
  FOR DELETE USING (auth.uid() = user_id);
