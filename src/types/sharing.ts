import type { ScenarioVisibility } from './index'

/** Owner-facing view of a published version's access configuration. Never includes the password hash. */
export interface ShareSettings {
  scenarioId: string
  versionId: string
  slug: string
  visibility: ScenarioVisibility
  accessEnabled: boolean
  /** True when a password has been set — the actual hash/value is never returned. */
  hasPassword: boolean
  updatedAt?: string
}

export interface ShareToken {
  id: string
  scenarioVersionId: string
  scenarioId: string | null
  token: string
  label: string | null
  createdBy: string
  createdAt: string
  expiresAt: string | null
  revokedAt: string | null
  lastUsedAt: string | null
  useCount: number
}

export interface ShareSettingsUpdate {
  visibility?: ScenarioVisibility
  accessEnabled?: boolean
  /** Set a new password. Empty string clears it. Omit to leave unchanged. */
  password?: string
}
