import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Service-role Supabase client — bypasses RLS entirely.
 *
 * Use ONLY in server-side route handlers, and ONLY for the narrow set of
 * operations that legitimately require reading/writing rows the requester
 * (anonymous viewer, or owner via a different row) cannot see under RLS:
 *   - reading password_hash to verify a play-gate password
 *   - looking up / incrementing share tokens
 *   - loading gated scenario content after access has been verified
 *
 * Never forward this client's results to the browser without first checking
 * that the requester is actually allowed to see them.
 */
export function getSupabaseServiceRole() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. Add it to your environment ' +
      '(Project Settings → API → service_role key in Supabase) to enable ' +
      'password-protected and private scenario sharing.'
    )
  }
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
