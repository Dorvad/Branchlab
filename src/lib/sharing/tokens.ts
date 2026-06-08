// Server-side only. Share-link tokens grant access to gated published
// scenarios via /play/[slug]?token=... — they must be unguessable, so we use
// crypto.randomBytes rather than the human-typeable join-code alphabet.
import { randomBytes } from 'crypto'

export function generateShareToken(): string {
  return randomBytes(24).toString('base64url')
}
