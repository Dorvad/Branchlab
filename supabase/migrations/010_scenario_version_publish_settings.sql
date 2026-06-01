-- Add publish settings columns to scenario_versions so getPublishedBySlug()
-- can return orientation, passwordProtected, and password directly from the
-- scenario_versions table without relying on the JSONB published_version field
-- on the scenarios table.

ALTER TABLE public.scenario_versions
  ADD COLUMN IF NOT EXISTS orientation        text        DEFAULT 'vertical',
  ADD COLUMN IF NOT EXISTS password_protected boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS password           text;
