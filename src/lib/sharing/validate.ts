// Server-side input validation for share-settings & share-token payloads.
import type { ScenarioVisibility } from '@/types'

const VISIBILITIES: ScenarioVisibility[] = ['public', 'unlisted', 'password', 'private']

export interface ShareSettingsPatch {
  visibility?: ScenarioVisibility
  accessEnabled?: boolean
  password?: string | null
}

/** Returns a validated patch, or an error string. */
export function parseShareSettingsPatch(body: unknown): ShareSettingsPatch | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Invalid payload' }
  const b = body as Record<string, unknown>
  const patch: ShareSettingsPatch = {}

  if ('visibility' in b) {
    if (typeof b.visibility !== 'string' || !VISIBILITIES.includes(b.visibility as ScenarioVisibility)) {
      return { error: 'visibility must be one of: public, unlisted, password, private' }
    }
    patch.visibility = b.visibility as ScenarioVisibility
  }

  if ('accessEnabled' in b) {
    if (typeof b.accessEnabled !== 'boolean') return { error: 'accessEnabled must be a boolean' }
    patch.accessEnabled = b.accessEnabled
  }

  if ('password' in b) {
    if (b.password === null) {
      patch.password = null
    } else if (typeof b.password === 'string') {
      if (b.password.length > 0 && b.password.length < 4) {
        return { error: 'Password must be at least 4 characters' }
      }
      if (b.password.length > 200) return { error: 'Password is too long' }
      patch.password = b.password
    } else {
      return { error: 'password must be a string or null' }
    }
  }

  return patch
}

export interface ShareTokenCreatePayload {
  label?: string | null
  expiresAt?: string | null
}

export function parseShareTokenCreate(body: unknown): ShareTokenCreatePayload | { error: string } {
  if (typeof body !== 'object' || body === null) return {}
  const b = body as Record<string, unknown>
  const payload: ShareTokenCreatePayload = {}

  if ('label' in b && b.label !== null && b.label !== undefined) {
    if (typeof b.label !== 'string' || b.label.length > 100) return { error: 'label must be a string up to 100 characters' }
    payload.label = b.label.trim() || null
  }

  if ('expiresAt' in b && b.expiresAt !== null && b.expiresAt !== undefined) {
    if (typeof b.expiresAt !== 'string' || Number.isNaN(Date.parse(b.expiresAt))) {
      return { error: 'expiresAt must be a valid ISO date string' }
    }
    payload.expiresAt = b.expiresAt
  }

  return payload
}
