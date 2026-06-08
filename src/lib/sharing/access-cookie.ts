// Server-side only. Short-lived, HMAC-signed access tokens for the play-gate
// cookie set after a successful password check. The cookie carries no secret
// data (no password, no hash) — just a signed claim that this browser proved
// it knew the password for this exact slug+version, with an expiry.
//
// We avoid adding a JWT dependency: a base64url(payload) + base64url(HMAC-SHA256)
// pair, verified with a constant-time comparison, gives the same guarantees
// (integrity + expiry) for this narrow use case.
import { createHmac, timingSafeEqual } from 'crypto'

const TTL_SECONDS = 60 * 60 * 12 // 12 hours

interface AccessPayload {
  slug: string
  versionId: string
  exp: number // unix seconds
}

function getSecret(): string {
  return (
    process.env.SHARE_LINK_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'branchlab-dev-share-secret-do-not-use-in-prod'
  )
}

function sign(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('base64url')
}

export function accessCookieName(slug: string): string {
  return `blab_access_${slug}`
}

export function createAccessCookieValue(slug: string, versionId: string): { value: string; maxAge: number } {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS
  const data = Buffer.from(JSON.stringify({ slug, versionId, exp } satisfies AccessPayload)).toString('base64url')
  return { value: `${data}.${sign(data)}`, maxAge: TTL_SECONDS }
}

export function verifyAccessCookieValue(value: string | undefined, slug: string, versionId: string): boolean {
  if (!value) return false
  const dot = value.lastIndexOf('.')
  if (dot < 1) return false
  const data = value.slice(0, dot)
  const sig = value.slice(dot + 1)

  const expectedSig = sign(data)
  const a = Buffer.from(sig)
  const b = Buffer.from(expectedSig)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as AccessPayload
    if (payload.slug !== slug || payload.versionId !== versionId) return false
    if (payload.exp < Math.floor(Date.now() / 1000)) return false
    return true
  } catch {
    return false
  }
}
