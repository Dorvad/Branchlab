// ── Enum types ─────────────────────────────────────────────────────────────────

export type ThemePreference = 'dark' | 'light' | 'system'
export type InterfaceDensity = 'comfortable' | 'compact'
export type MotionPreference = 'full' | 'reduced'
export type SupportedLanguage = 'en' | 'he'
export type DashboardView = 'grid' | 'list'
export type EditorOpenBehavior = 'fit_graph' | 'last_view' | 'start_node'
export type ScenarioVisibility = 'private' | 'unlisted' | 'public'
export type ValidationMode = 'errors_only' | 'errors_and_warnings'
export type ThumbnailSource = 'last_frame' | 'custom' | 'placeholder'
export type FeedbackBehavior = 'overlay' | 'separate_step' | 'disabled'
export type RestartButtonMode = 'always' | 'ending_only' | 'never'
export type ChoiceDisplayStyle = 'video_overlay' | 'separate_screen' | 'bottom_sheet'
export type VideoControlsMode = 'full' | 'minimal' | 'hidden'
export type SlugStyle = 'random' | 'scenario_title' | 'workspace_prefix'
export type AssetViewMode = 'recent' | 'by_scenario' | 'all'
export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface UserProfile {
  userId: string
  displayName: string | null
  avatarUrl: string | null
}

export interface UserPreferences {
  userId: string
  theme: ThemePreference
  interfaceDensity: InterfaceDensity
  motionPreference: MotionPreference
  language: SupportedLanguage
  timezone: string
  defaultDashboardView: DashboardView
  editorOpenBehavior: EditorOpenBehavior
}

export interface WorkspaceSettings {
  userId: string
  workspaceName: string
  workspaceSlug: string | null
  workspaceLogoUrl: string | null
  workspaceTimezone: string
  // scenario defaults
  defaultScenarioLanguage: SupportedLanguage
  defaultScenarioVisibility: ScenarioVisibility
  defaultValidationMode: ValidationMode
  defaultThumbnailSource: ThumbnailSource
  defaultFeedbackBehavior: FeedbackBehavior
  // player defaults
  playerShowScenarioTitle: boolean
  playerShowProgressBar: boolean
  playerShowRestartButton: RestartButtonMode
  playerChoiceDisplayStyle: ChoiceDisplayStyle
  playerChoiceDelaySeconds: number
  playerVideoControls: VideoControlsMode
  playerReducedMotion: boolean
  // publishing defaults
  publishingDefaultVisibility: ScenarioVisibility
  publishingRequireValidation: boolean
  publishingAllowSearchIndexing: boolean
  publishingSlugStyle: SlugStyle
  // media preferences
  mediaDefaultAssetView: AssetViewMode
  mediaWarnBeforeLargeUpload: boolean
  mediaAutoDeleteUnusedAssets: boolean
}

export interface AllSettings {
  profile: UserProfile
  preferences: UserPreferences
  workspace: WorkspaceSettings
}

export interface StorageStats {
  clipCount: number
  totalBytes: number
}

// ── Defaults ───────────────────────────────────────────────────────────────────

export const DEFAULT_PREFERENCES: Omit<UserPreferences, 'userId'> = {
  theme: 'dark',
  interfaceDensity: 'comfortable',
  motionPreference: 'full',
  language: 'en',
  timezone: 'Asia/Jerusalem',
  defaultDashboardView: 'grid',
  editorOpenBehavior: 'fit_graph',
}

export const DEFAULT_WORKSPACE: Omit<WorkspaceSettings, 'userId'> = {
  workspaceName: 'My BranchLab Workspace',
  workspaceSlug: null,
  workspaceLogoUrl: null,
  workspaceTimezone: 'Asia/Jerusalem',
  defaultScenarioLanguage: 'en',
  defaultScenarioVisibility: 'private',
  defaultValidationMode: 'errors_and_warnings',
  defaultThumbnailSource: 'placeholder',
  defaultFeedbackBehavior: 'overlay',
  playerShowScenarioTitle: false,
  playerShowProgressBar: false,
  playerShowRestartButton: 'ending_only',
  playerChoiceDisplayStyle: 'video_overlay',
  playerChoiceDelaySeconds: 0,
  playerVideoControls: 'minimal',
  playerReducedMotion: false,
  publishingDefaultVisibility: 'unlisted',
  publishingRequireValidation: true,
  publishingAllowSearchIndexing: false,
  publishingSlugStyle: 'random',
  mediaDefaultAssetView: 'recent',
  mediaWarnBeforeLargeUpload: true,
  mediaAutoDeleteUnusedAssets: false,
}
