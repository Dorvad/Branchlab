// Server-side only. First "owner-authenticated route" pattern in the codebase:
// the browser forwards its Supabase access token, we create a request-scoped
// client bound to that token (so `auth.uid()` resolves inside RLS), validate
// it, and let the existing "owner select/update" RLS policies on `scenarios`
// and `scenario_versions` do the actual ownership enforcement — no
// service-role privileges needed for owner-facing CRUD.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export interface AuthedRequest {
  userId: string
  sb: SupabaseClient<Database>
}

export async function authenticateRequest(request: Request): Promise<AuthedRequest | null> {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  if (!token) return null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  const sb = createClient<Database>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await sb.auth.getUser(token)
  if (error || !data.user) return null

  return { userId: data.user.id, sb }
}

/**
 * Loads the scenario row scoped to the authenticated client — RLS's
 * "owner select" policy (auth.uid() = user_id) means a non-owner gets no row.
 */
export async function requireOwnedScenario(auth: AuthedRequest, scenarioId: string) {
  // Select only what callers need (ownership gating + the cached publish
  // snapshot for share-settings sync) — `scenarios.nodes`/`edges` can be large
  // branching-graph JSONB blobs that none of the sharing routes use.
  const { data, error } = await auth.sb
    .from('scenarios')
    .select('id, user_id, published_version')
    .eq('id', scenarioId)
    .maybeSingle()

  if (error || !data) return null
  return data as Record<string, unknown> & { id: string; user_id: string; published_version: unknown }
}
