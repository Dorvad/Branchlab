// POST /api/play/[slug]/verify-password
//
// Verifies a viewer-supplied password against the stored bcrypt hash using
// the service-role client (RLS hides password_hash from anon clients by
// design — see migration 013). On success, sets a short-lived signed cookie
// scoped to this slug+version so the player can be reloaded without
// re-prompting. Never returns the hash, never logs the password.

import { getSupabaseServiceRole } from '@/lib/supabase/service'
import { verifySharePassword, createAccessCookieValue, accessCookieName } from '@/lib/sharing'
import type { ScenarioVisibility } from '@/types'

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const password = (body as { password?: unknown } | null)?.password
  if (typeof password !== 'string' || password.length === 0) {
    return Response.json({ error: 'Password is required' }, { status: 400 })
  }

  const sb = getSupabaseServiceRole()
  const { data, error } = await sb
    .from('scenario_versions')
    .select('id, visibility, access_enabled, password_hash')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) return Response.json({ error: 'Scenario not found' }, { status: 404 })

  const row = data as { id: string; visibility: ScenarioVisibility | null; access_enabled: boolean | null; password_hash: string | null }

  if (row.access_enabled === false) {
    return Response.json({ error: 'This scenario is currently unavailable' }, { status: 403 })
  }
  if (row.visibility !== 'password' || !row.password_hash) {
    return Response.json({ error: 'This scenario is not password-protected' }, { status: 400 })
  }

  const valid = await verifySharePassword(password, row.password_hash)
  if (!valid) {
    return Response.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const { value, maxAge } = createAccessCookieValue(slug, row.id)
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''

  const response = Response.json({ ok: true })
  response.headers.append(
    'Set-Cookie',
    `${accessCookieName(slug)}=${value}; Path=/play/${encodeURIComponent(slug)}; Max-Age=${maxAge}; HttpOnly${secure}; SameSite=Lax`
  )
  return response
}
