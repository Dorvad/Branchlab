import { isSupabaseMode } from './mode'
import * as local from '@/lib/local-store/settings'
import * as remote from '@/lib/settings/settings-service'
import type { UserProfile, UserPreferences, WorkspaceSettings, AllSettings, StorageStats } from '@/lib/settings/types'

export async function getAllSettings(): Promise<AllSettings> {
  if (isSupabaseMode()) return remote.getAllSettings()
  return local.getAllSettings()
}

export async function updateProfile(userId: string, patch: Partial<UserProfile>): Promise<UserProfile> {
  if (isSupabaseMode()) return remote.updateProfile(userId, patch)
  return local.updateProfile(userId, patch)
}

export async function updatePreferences(userId: string, patch: Partial<UserPreferences>): Promise<UserPreferences> {
  if (isSupabaseMode()) return remote.updatePreferences(userId, patch)
  return local.updatePreferences(userId, patch)
}

export async function updateWorkspaceSettings(userId: string, patch: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
  if (isSupabaseMode()) return remote.updateWorkspaceSettings(userId, patch)
  return local.updateWorkspaceSettings(userId, patch)
}

export async function getStorageStats(): Promise<StorageStats> {
  if (isSupabaseMode()) return remote.getStorageStats()
  return local.getStorageStats()
}
