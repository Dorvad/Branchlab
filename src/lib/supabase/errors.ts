import { getSupabaseClient } from './client'

export function dbError(err: unknown): Error {
  const e = err as { message?: string; details?: string; hint?: string } | null
  return new Error(e?.message ?? e?.details ?? e?.hint ?? 'Database error')
}

export async function requireUserId(): Promise<string> {
  const sb = getSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}
