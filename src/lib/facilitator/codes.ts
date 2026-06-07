// Join codes are short, human-typeable identifiers participants enter on
// their phones (e.g. "A7K92"). Excludes visually-ambiguous characters
// (0/O, 1/I/L) so codes read cleanly on a projector and on a phone keyboard.

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const LENGTH = 5

export function generateJoinCode(): string {
  let code = ''
  for (let i = 0; i < LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return code
}

export function normalizeJoinCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}
