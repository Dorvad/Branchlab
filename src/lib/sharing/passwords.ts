// Server-side only — never import from client components/bundles.
// bcryptjs hashes are salted and one-way; we never store or transmit plain text.
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

export async function hashSharePassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifySharePassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash)
  } catch {
    return false
  }
}
