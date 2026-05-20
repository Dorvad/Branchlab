import { getSupabaseClient } from './client'

export async function signUp(email: string, password: string) {
  const sb = getSupabaseClient()
  const { data, error } = await sb.auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const sb = getSupabaseClient()
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const sb = getSupabaseClient()
  const { error } = await sb.auth.signOut()
  if (error) throw error
}

export async function getUser() {
  const sb = getSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  return user
}
