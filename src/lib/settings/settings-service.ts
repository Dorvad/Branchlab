import { getSupabaseClient } from '@/lib/supabase/client'
import { requireUserId } from '@/lib/supabase/errors'
import type {
  UserProfile, UserPreferences, WorkspaceSettings, AllSettings, StorageStats,
} from './types'
import { DEFAULT_PREFERENCES, DEFAULT_WORKSPACE } from './types'

// ── Row mappers ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProfile(row: any): UserProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name ?? null,
    avatarUrl: row.avatar_url ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPreferences(row: any): UserPreferences {
  return {
    userId: row.user_id,
    theme: row.theme,
    interfaceDensity: row.interface_density,
    motionPreference: row.motion_preference,
    language: row.language,
    timezone: row.timezone,
    defaultDashboardView: row.default_dashboard_view,
    editorOpenBehavior: row.editor_open_behavior,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToWorkspace(row: any): WorkspaceSettings {
  return {
    userId: row.user_id,
    workspaceName: row.workspace_name,
    workspaceSlug: row.workspace_slug ?? null,
    workspaceLogoUrl: row.workspace_logo_url ?? null,
    workspaceTimezone: row.workspace_timezone,
    defaultScenarioLanguage: row.default_scenario_language,
    defaultScenarioVisibility: row.default_scenario_visibility,
    defaultValidationMode: row.default_validation_mode,
    defaultThumbnailSource: row.default_thumbnail_source,
    defaultFeedbackBehavior: row.default_feedback_behavior,
    playerShowScenarioTitle: row.player_show_scenario_title,
    playerShowProgressBar: row.player_show_progress_bar,
    playerShowRestartButton: row.player_show_restart_button,
    playerChoiceDisplayStyle: row.player_choice_display_style,
    playerChoiceDelaySeconds: row.player_choice_delay_seconds,
    playerVideoControls: row.player_video_controls,
    playerReducedMotion: row.player_reduced_motion,
    publishingDefaultVisibility: row.publishing_default_visibility,
    publishingRequireValidation: row.publishing_require_validation,
    publishingAllowSearchIndexing: row.publishing_allow_search_indexing,
    publishingSlugStyle: row.publishing_slug_style,
    mediaDefaultAssetView: row.media_default_asset_view,
    mediaWarnBeforeLargeUpload: row.media_warn_before_large_upload,
    mediaAutoDeleteUnusedAssets: row.media_auto_delete_unused_assets,
  }
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getOrCreateProfile(userId: string): Promise<UserProfile> {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('user_profiles')
    .upsert({ user_id: userId }, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return rowToProfile(data)
}

export async function updateProfile(userId: string, patch: Partial<UserProfile>): Promise<UserProfile> {
  const sb = getSupabaseClient()
  const row: Record<string, unknown> = {}
  if ('displayName' in patch) row.display_name = patch.displayName ?? null
  if ('avatarUrl' in patch) row.avatar_url = patch.avatarUrl ?? null

  const { data, error } = await sb
    .from('user_profiles')
    .update(row)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return rowToProfile(data)
}

// ── Preferences ───────────────────────────────────────────────────────────────

export async function getOrCreatePreferences(userId: string): Promise<UserPreferences> {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('user_preferences')
    .upsert(
      { user_id: userId, ...preferencesToRow({ userId, ...DEFAULT_PREFERENCES }) },
      { onConflict: 'user_id', ignoreDuplicates: true },
    )
    .select()
    .single()
  if (error) throw new Error(error.message)
  return rowToPreferences(data)
}

function preferencesToRow(p: UserPreferences): Record<string, unknown> {
  return {
    user_id: p.userId,
    theme: p.theme,
    interface_density: p.interfaceDensity,
    motion_preference: p.motionPreference,
    language: p.language,
    timezone: p.timezone,
    default_dashboard_view: p.defaultDashboardView,
    editor_open_behavior: p.editorOpenBehavior,
  }
}

export async function updatePreferences(userId: string, patch: Partial<UserPreferences>): Promise<UserPreferences> {
  const sb = getSupabaseClient()
  const row: Record<string, unknown> = {}
  if ('theme' in patch) row.theme = patch.theme
  if ('interfaceDensity' in patch) row.interface_density = patch.interfaceDensity
  if ('motionPreference' in patch) row.motion_preference = patch.motionPreference
  if ('language' in patch) row.language = patch.language
  if ('timezone' in patch) row.timezone = patch.timezone
  if ('defaultDashboardView' in patch) row.default_dashboard_view = patch.defaultDashboardView
  if ('editorOpenBehavior' in patch) row.editor_open_behavior = patch.editorOpenBehavior

  const { data, error } = await sb
    .from('user_preferences')
    .update(row)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return rowToPreferences(data)
}

// ── Workspace settings ────────────────────────────────────────────────────────

export async function getOrCreateWorkspaceSettings(userId: string): Promise<WorkspaceSettings> {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('workspace_settings')
    .upsert(
      { user_id: userId, ...workspaceToRow({ userId, ...DEFAULT_WORKSPACE }) },
      { onConflict: 'user_id', ignoreDuplicates: true },
    )
    .select()
    .single()
  if (error) throw new Error(error.message)
  return rowToWorkspace(data)
}

function workspaceToRow(w: WorkspaceSettings): Record<string, unknown> {
  return {
    user_id: w.userId,
    workspace_name: w.workspaceName,
    workspace_slug: w.workspaceSlug ?? null,
    workspace_logo_url: w.workspaceLogoUrl ?? null,
    workspace_timezone: w.workspaceTimezone,
    default_scenario_language: w.defaultScenarioLanguage,
    default_scenario_visibility: w.defaultScenarioVisibility,
    default_validation_mode: w.defaultValidationMode,
    default_thumbnail_source: w.defaultThumbnailSource,
    default_feedback_behavior: w.defaultFeedbackBehavior,
    player_show_scenario_title: w.playerShowScenarioTitle,
    player_show_progress_bar: w.playerShowProgressBar,
    player_show_restart_button: w.playerShowRestartButton,
    player_choice_display_style: w.playerChoiceDisplayStyle,
    player_choice_delay_seconds: w.playerChoiceDelaySeconds,
    player_video_controls: w.playerVideoControls,
    player_reduced_motion: w.playerReducedMotion,
    publishing_default_visibility: w.publishingDefaultVisibility,
    publishing_require_validation: w.publishingRequireValidation,
    publishing_allow_search_indexing: w.publishingAllowSearchIndexing,
    publishing_slug_style: w.publishingSlugStyle,
    media_default_asset_view: w.mediaDefaultAssetView,
    media_warn_before_large_upload: w.mediaWarnBeforeLargeUpload,
    media_auto_delete_unused_assets: w.mediaAutoDeleteUnusedAssets,
  }
}

export async function updateWorkspaceSettings(userId: string, patch: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
  const sb = getSupabaseClient()
  const row: Record<string, unknown> = {}

  const map: Record<string, string> = {
    workspaceName: 'workspace_name',
    workspaceSlug: 'workspace_slug',
    workspaceLogoUrl: 'workspace_logo_url',
    workspaceTimezone: 'workspace_timezone',
    defaultScenarioLanguage: 'default_scenario_language',
    defaultScenarioVisibility: 'default_scenario_visibility',
    defaultValidationMode: 'default_validation_mode',
    defaultThumbnailSource: 'default_thumbnail_source',
    defaultFeedbackBehavior: 'default_feedback_behavior',
    playerShowScenarioTitle: 'player_show_scenario_title',
    playerShowProgressBar: 'player_show_progress_bar',
    playerShowRestartButton: 'player_show_restart_button',
    playerChoiceDisplayStyle: 'player_choice_display_style',
    playerChoiceDelaySeconds: 'player_choice_delay_seconds',
    playerVideoControls: 'player_video_controls',
    playerReducedMotion: 'player_reduced_motion',
    publishingDefaultVisibility: 'publishing_default_visibility',
    publishingRequireValidation: 'publishing_require_validation',
    publishingAllowSearchIndexing: 'publishing_allow_search_indexing',
    publishingSlugStyle: 'publishing_slug_style',
    mediaDefaultAssetView: 'media_default_asset_view',
    mediaWarnBeforeLargeUpload: 'media_warn_before_large_upload',
    mediaAutoDeleteUnusedAssets: 'media_auto_delete_unused_assets',
  }

  for (const [tsKey, dbKey] of Object.entries(map)) {
    if (tsKey in patch) row[dbKey] = (patch as Record<string, unknown>)[tsKey] ?? null
  }

  const { data, error } = await sb
    .from('workspace_settings')
    .update(row)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return rowToWorkspace(data)
}

// ── All settings ──────────────────────────────────────────────────────────────

export async function getAllSettings(): Promise<AllSettings> {
  const userId = await requireUserId()
  const [profile, preferences, workspace] = await Promise.all([
    getOrCreateProfile(userId),
    getOrCreatePreferences(userId),
    getOrCreateWorkspaceSettings(userId),
  ])
  return { profile, preferences, workspace }
}

// ── Storage stats ─────────────────────────────────────────────────────────────

export async function getStorageStats(): Promise<StorageStats> {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('clips')
    .select('size')

  if (error) return { clipCount: 0, totalBytes: 0 }
  const rows = (data ?? []) as Array<{ size: number }>
  return {
    clipCount: rows.length,
    totalBytes: rows.reduce((sum, r) => sum + (r.size ?? 0), 0),
  }
}
