-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  BranchLab — User Settings                                              ║
-- ║  Run in Supabase SQL Editor (single pass, safe to re-run)               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme                  text NOT NULL DEFAULT 'dark'
                           CHECK (theme IN ('dark','light','system')),
  interface_density      text NOT NULL DEFAULT 'comfortable'
                           CHECK (interface_density IN ('comfortable','compact')),
  motion_preference      text NOT NULL DEFAULT 'full'
                           CHECK (motion_preference IN ('full','reduced')),
  language               text NOT NULL DEFAULT 'en'
                           CHECK (language IN ('en','he')),
  timezone               text NOT NULL DEFAULT 'Asia/Jerusalem',
  default_dashboard_view text NOT NULL DEFAULT 'grid'
                           CHECK (default_dashboard_view IN ('grid','list')),
  editor_open_behavior   text NOT NULL DEFAULT 'fit_graph'
                           CHECK (editor_open_behavior IN ('fit_graph','last_view','start_node')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workspace_settings (
  user_id                            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_name                     text NOT NULL DEFAULT 'My BranchLab Workspace',
  workspace_slug                     text UNIQUE,
  workspace_logo_url                 text,
  workspace_timezone                 text NOT NULL DEFAULT 'Asia/Jerusalem',
  -- scenario defaults
  default_scenario_language          text NOT NULL DEFAULT 'en'
                                       CHECK (default_scenario_language IN ('en','he')),
  default_scenario_visibility        text NOT NULL DEFAULT 'private'
                                       CHECK (default_scenario_visibility IN ('private','unlisted','public')),
  default_validation_mode            text NOT NULL DEFAULT 'errors_and_warnings'
                                       CHECK (default_validation_mode IN ('errors_only','errors_and_warnings')),
  default_thumbnail_source           text NOT NULL DEFAULT 'placeholder'
                                       CHECK (default_thumbnail_source IN ('last_frame','custom','placeholder')),
  default_feedback_behavior          text NOT NULL DEFAULT 'overlay'
                                       CHECK (default_feedback_behavior IN ('overlay','separate_step','disabled')),
  -- player defaults
  player_show_scenario_title         boolean NOT NULL DEFAULT false,
  player_show_progress_bar           boolean NOT NULL DEFAULT false,
  player_show_restart_button         text NOT NULL DEFAULT 'ending_only'
                                       CHECK (player_show_restart_button IN ('always','ending_only','never')),
  player_choice_display_style        text NOT NULL DEFAULT 'video_overlay'
                                       CHECK (player_choice_display_style IN ('video_overlay','separate_screen','bottom_sheet')),
  player_choice_delay_seconds        integer NOT NULL DEFAULT 0
                                       CHECK (player_choice_delay_seconds >= 0 AND player_choice_delay_seconds <= 30),
  player_video_controls              text NOT NULL DEFAULT 'minimal'
                                       CHECK (player_video_controls IN ('full','minimal','hidden')),
  player_reduced_motion              boolean NOT NULL DEFAULT false,
  -- publishing defaults
  publishing_default_visibility      text NOT NULL DEFAULT 'unlisted'
                                       CHECK (publishing_default_visibility IN ('private','unlisted','public')),
  publishing_require_validation      boolean NOT NULL DEFAULT true,
  publishing_allow_search_indexing   boolean NOT NULL DEFAULT false,
  publishing_slug_style              text NOT NULL DEFAULT 'random'
                                       CHECK (publishing_slug_style IN ('random','scenario_title','workspace_prefix')),
  -- media preferences
  media_default_asset_view           text NOT NULL DEFAULT 'recent'
                                       CHECK (media_default_asset_view IN ('recent','by_scenario','all')),
  media_warn_before_large_upload     boolean NOT NULL DEFAULT true,
  media_auto_delete_unused_assets    boolean NOT NULL DEFAULT false,
  created_at                         timestamptz NOT NULL DEFAULT now(),
  updated_at                         timestamptz NOT NULL DEFAULT now()
);

-- ── Triggers (reuse existing handle_updated_at from 001_initial_schema.sql) ──

DROP TRIGGER IF EXISTS user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS workspace_settings_updated_at ON public.workspace_settings;
CREATE TRIGGER workspace_settings_updated_at
  BEFORE UPDATE ON public.workspace_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

-- user_profiles

DROP POLICY IF EXISTS "self select" ON public.user_profiles;
CREATE POLICY "self select" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "self insert" ON public.user_profiles;
CREATE POLICY "self insert" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "self update" ON public.user_profiles;
CREATE POLICY "self update" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "self delete" ON public.user_profiles;
CREATE POLICY "self delete" ON public.user_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- user_preferences

DROP POLICY IF EXISTS "self select" ON public.user_preferences;
CREATE POLICY "self select" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "self insert" ON public.user_preferences;
CREATE POLICY "self insert" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "self update" ON public.user_preferences;
CREATE POLICY "self update" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "self delete" ON public.user_preferences;
CREATE POLICY "self delete" ON public.user_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- workspace_settings

DROP POLICY IF EXISTS "self select" ON public.workspace_settings;
CREATE POLICY "self select" ON public.workspace_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "self insert" ON public.workspace_settings;
CREATE POLICY "self insert" ON public.workspace_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "self update" ON public.workspace_settings;
CREATE POLICY "self update" ON public.workspace_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "self delete" ON public.workspace_settings;
CREATE POLICY "self delete" ON public.workspace_settings
  FOR DELETE USING (auth.uid() = user_id);
