// Server-side only. Resolves whether a viewer may see a published scenario's
// content for a given slug, given their cookies and an optional share token.
// This is the single real gatekeeper — the player route must never receive
// scenario JSON until this returns `allowed: true`.
//
// Note on ownership: the app has no server-side session (Supabase auth lives
// in the browser's localStorage, not cookies), so this resolver cannot know
// who the visitor is. For `private` scenarios we return `status: 'private'`
// and let a client component prove ownership itself — by reading its own
// Supabase session and querying scenario_versions directly, which RLS already
// scopes to `auth.uid() = user_id` (see migration 013). The server never sees
// or forwards private scenario content for non-owners.
import { getSupabaseServiceRole } from '@/lib/supabase/service'
import { verifyAccessCookieValue } from './access-cookie'
import type { ScenarioVisibility } from '@/types'

export type PlayAccessResult =
  | { status: 'not-found' }
  | { status: 'disabled' }
  | { status: 'password-required'; versionId: string; slug: string }
  | { status: 'private'; slug: string }
  | { status: 'denied' }
  | { status: 'allowed'; versionRow: Record<string, unknown> }

interface ResolveArgs {
  slug: string
  cookieValue: string | undefined // raw access cookie value for this slug
  token: string | null // ?token=... query param
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recordTokenUse(sb: ReturnType<typeof getSupabaseServiceRole>, tokenRow: any) {
  await sb
    .from('scenario_share_tokens')
    .update({
      use_count: (tokenRow.use_count ?? 0) + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', tokenRow.id)
}

export async function resolvePlayAccess({ slug, cookieValue, token }: ResolveArgs): Promise<PlayAccessResult> {
  const sb = getSupabaseServiceRole()

  const { data: versionRow, error } = await sb
    .from('scenario_versions')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !versionRow) return { status: 'not-found' }

  const row = versionRow as Record<string, unknown>
  const visibility = (row.visibility as ScenarioVisibility | null) ?? 'public'
  const accessEnabled = (row.access_enabled as boolean | null) ?? true
  const versionId = row.id as string

  if (!accessEnabled) return { status: 'disabled' }

  if (visibility === 'public' || visibility === 'unlisted') {
    return { status: 'allowed', versionRow: row }
  }

  if (visibility === 'private') {
    return { status: 'private', slug }
  }

  // visibility === 'password' from here on — check token, then cookie.
  if (token) {
    const { data: tokenRow } = await sb
      .from('scenario_share_tokens')
      .select('*')
      .eq('token', token)
      .eq('scenario_version_id', versionId)
      .maybeSingle()

    if (tokenRow) {
      const t = tokenRow as Record<string, unknown>
      const revoked = !!t.revoked_at
      const expired = !!t.expires_at && new Date(t.expires_at as string).getTime() < Date.now()
      if (!revoked && !expired) {
        await recordTokenUse(sb, t)
        return { status: 'allowed', versionRow: row }
      }
    }
  }

  if (verifyAccessCookieValue(cookieValue, slug, versionId)) {
    return { status: 'allowed', versionRow: row }
  }

  if (!row.password_hash) {
    // Misconfigured: password mode without a password set. The owner needs to
    // fix this from Share Settings — there is nothing a viewer can do.
    return { status: 'denied' }
  }

  return { status: 'password-required', versionId, slug }
}
