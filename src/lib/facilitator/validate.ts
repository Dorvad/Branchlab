// Lightweight payload validation for the facilitator write routes — same
// approach as src/lib/analytics/validate.ts (small fixed shapes, no schema lib).

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

function isNonEmptyString(v: unknown, maxLen = 256): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= maxLen
}

function isOptionalString(v: unknown, maxLen = 256): v is string | undefined {
  return v === undefined || v === null || (typeof v === 'string' && v.length <= maxLen)
}

// ── join ──────────────────────────────────────────────────────────────────────

export interface JoinPayload {
  joinCode: string
  anonymousId: string
  displayName?: string
}

export function parseJoin(body: unknown): JoinPayload | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (!isNonEmptyString(b.joinCode, 16)) return null
  if (!isNonEmptyString(b.anonymousId, 128)) return null
  if (!isOptionalString(b.displayName, 64)) return null
  const displayName = typeof b.displayName === 'string' ? b.displayName.trim().slice(0, 64) : undefined
  return {
    joinCode: b.joinCode.trim().toUpperCase(),
    anonymousId: b.anonymousId,
    displayName: displayName || undefined,
  }
}

// ── vote ──────────────────────────────────────────────────────────────────────

export interface VotePayload {
  sessionId: string
  anonymousId: string
  nodeId: string
  choiceId: string
}

export function parseVote(body: unknown): VotePayload | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (!isUuid(b.sessionId)) return null
  if (!isNonEmptyString(b.anonymousId, 128)) return null
  if (!isNonEmptyString(b.nodeId, 256)) return null
  if (!isNonEmptyString(b.choiceId, 256)) return null
  return {
    sessionId: b.sessionId,
    anonymousId: b.anonymousId,
    nodeId: b.nodeId,
    choiceId: b.choiceId,
  }
}
