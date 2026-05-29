type PersistenceMode = 'local' | 'supabase'

const VALID: PersistenceMode[] = ['local', 'supabase']

export function getPersistenceMode(): PersistenceMode {
  const raw = process.env.NEXT_PUBLIC_BRANCHLAB_PERSISTENCE
  return VALID.includes(raw as PersistenceMode) ? (raw as PersistenceMode) : 'local'
}

export function isSupabaseMode(): boolean {
  return getPersistenceMode() === 'supabase'
}

export function isLocalMode(): boolean {
  return getPersistenceMode() === 'local'
}
