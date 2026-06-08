'use client'

// Browser-side helpers for the owner-facing Share Settings UI. Forwards the
// current Supabase session's access token as a Bearer header — the API routes
// validate it and rely on RLS for ownership (see lib/sharing/auth.ts).
import { getSupabaseClient } from '@/lib/supabase/client'
import type { ShareSettings, ShareSettingsUpdate, ShareToken } from '@/types/sharing'

async function authHeaders(): Promise<HeadersInit> {
  const sb = getSupabaseClient()
  const { data: { session } } = await sb.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  }
}

async function asJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error ?? 'Request failed')
  return data as T
}

export async function fetchShareSettings(scenarioId: string): Promise<ShareSettings> {
  const headers = await authHeaders()
  const res = await fetch(`/api/scenarios/${scenarioId}/share-settings`, { headers })
  const data = await asJson<{ shareSettings: ShareSettings }>(res)
  return data.shareSettings
}

export async function updateShareSettings(scenarioId: string, patch: ShareSettingsUpdate): Promise<ShareSettings> {
  const headers = await authHeaders()
  const res = await fetch(`/api/scenarios/${scenarioId}/share-settings`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(patch),
  })
  const data = await asJson<{ shareSettings: ShareSettings }>(res)
  return data.shareSettings
}

export async function fetchShareTokens(scenarioId: string): Promise<ShareToken[]> {
  const headers = await authHeaders()
  const res = await fetch(`/api/scenarios/${scenarioId}/share-tokens`, { headers })
  const data = await asJson<{ tokens: ShareToken[] }>(res)
  return data.tokens
}

export async function createShareToken(scenarioId: string, label?: string): Promise<ShareToken> {
  const headers = await authHeaders()
  const res = await fetch(`/api/scenarios/${scenarioId}/share-tokens`, {
    method: 'POST',
    headers,
    body: JSON.stringify(label ? { label } : {}),
  })
  const data = await asJson<{ token: ShareToken }>(res)
  return data.token
}

export async function revokeShareToken(scenarioId: string, tokenId: string): Promise<void> {
  const headers = await authHeaders()
  const res = await fetch(`/api/scenarios/${scenarioId}/share-tokens/${tokenId}`, {
    method: 'DELETE',
    headers,
  })
  await asJson(res)
}
