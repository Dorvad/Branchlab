import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

/** Server-side Supabase client. Use in Server Components and Route Handlers only. */
export function getSupabaseServer() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
