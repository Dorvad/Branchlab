import type {
  UserProfile, UserPreferences, WorkspaceSettings, AllSettings, StorageStats,
} from '@/lib/settings/types'
import { DEFAULT_PREFERENCES, DEFAULT_WORKSPACE } from '@/lib/settings/types'

const PROFILE_KEY = 'branchlab:settings:profile'
const PREFS_KEY = 'branchlab:settings:preferences'
const WORKSPACE_KEY = 'branchlab:settings:workspace'
const CLIPS_KEY = 'branchlab_clips'

const LOCAL_USER_ID = 'local-user'

function read<T>(key: string): T | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write<T>(key: string, val: T): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(key, JSON.stringify(val))
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getOrCreateProfile(): Promise<UserProfile> {
  const stored = read<UserProfile>(PROFILE_KEY)
  if (stored) return stored
  const p: UserProfile = { userId: LOCAL_USER_ID, displayName: null, avatarUrl: null }
  write(PROFILE_KEY, p)
  return p
}

export async function updateProfile(_userId: string, patch: Partial<UserProfile>): Promise<UserProfile> {
  const current = await getOrCreateProfile()
  const updated: UserProfile = { ...current, ...patch }
  write(PROFILE_KEY, updated)
  return updated
}

// ── Preferences ───────────────────────────────────────────────────────────────

export async function getOrCreatePreferences(): Promise<UserPreferences> {
  const stored = read<UserPreferences>(PREFS_KEY)
  if (stored) return stored
  const p: UserPreferences = { userId: LOCAL_USER_ID, ...DEFAULT_PREFERENCES }
  write(PREFS_KEY, p)
  return p
}

export async function updatePreferences(_userId: string, patch: Partial<UserPreferences>): Promise<UserPreferences> {
  const current = await getOrCreatePreferences()
  const updated: UserPreferences = { ...current, ...patch }
  write(PREFS_KEY, updated)
  return updated
}

// ── Workspace settings ────────────────────────────────────────────────────────

export async function getOrCreateWorkspaceSettings(): Promise<WorkspaceSettings> {
  const stored = read<WorkspaceSettings>(WORKSPACE_KEY)
  if (stored) return stored
  const w: WorkspaceSettings = { userId: LOCAL_USER_ID, ...DEFAULT_WORKSPACE }
  write(WORKSPACE_KEY, w)
  return w
}

export async function updateWorkspaceSettings(_userId: string, patch: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
  const current = await getOrCreateWorkspaceSettings()
  const updated: WorkspaceSettings = { ...current, ...patch }
  write(WORKSPACE_KEY, updated)
  return updated
}

// ── All settings ──────────────────────────────────────────────────────────────

export async function getAllSettings(): Promise<AllSettings> {
  const [profile, preferences, workspace] = await Promise.all([
    getOrCreateProfile(),
    getOrCreatePreferences(),
    getOrCreateWorkspaceSettings(),
  ])
  return { profile, preferences, workspace }
}

// ── Storage stats ─────────────────────────────────────────────────────────────

export async function getStorageStats(): Promise<StorageStats> {
  if (typeof localStorage === 'undefined') return { clipCount: 0, totalBytes: 0 }
  try {
    const raw = localStorage.getItem(CLIPS_KEY)
    if (!raw) return { clipCount: 0, totalBytes: 0 }
    const clips = Object.values(JSON.parse(raw) as Record<string, { size?: number }>)
    return {
      clipCount: clips.length,
      totalBytes: clips.reduce((s, c) => s + (c.size ?? 0), 0),
    }
  } catch {
    return { clipCount: 0, totalBytes: 0 }
  }
}
