export function validateDisplayName(v: string): string | null {
  if (v.length > 80) return 'Must be 80 characters or less'
  return null
}

export function validateWorkspaceName(v: string): string | null {
  if (!v || v.trim().length === 0) return 'Workspace name is required'
  if (v.length > 100) return 'Must be 100 characters or less'
  return null
}

export function validateWorkspaceSlug(v: string): string | null {
  if (!v || v.trim().length === 0) return null // optional
  if (v.length > 60) return 'Must be 60 characters or less'
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(v)) {
    return 'Only lowercase letters, numbers, and hyphens; cannot start or end with a hyphen'
  }
  return null
}

export function validateTimezone(v: string): string | null {
  if (!v || v.trim().length === 0) return 'Timezone is required'
  return null
}

export function validateChoiceDelay(v: number): string | null {
  if (!Number.isInteger(v)) return 'Must be a whole number'
  if (v < 0 || v > 30) return 'Must be between 0 and 30 seconds'
  return null
}
