type PersistenceMode = 'local' | 'supabase'

const VALID: PersistenceMode[] = ['local', 'supabase']

export function getPersistenceMode(): PersistenceMode {
  const raw = process.env.NEXT_PUBLIC_BRANCHLAB_PERSISTENCE
  // Explicit override wins.
  if (VALID.includes(raw as PersistenceMode)) return raw as PersistenceMode
  // Auto-detect: if Supabase credentials are present, use supabase mode so
  // that data syncs across devices without requiring the env var to be set.
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return 'supabase'
  }
  return 'local'
}

export function isSupabaseMode(): boolean {
  return getPersistenceMode() === 'supabase'
}

export function isLocalMode(): boolean {
  return getPersistenceMode() === 'local'
}
