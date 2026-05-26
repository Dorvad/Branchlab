/**
 * Parse a human-readable timestamp string into seconds.
 * Supports: SS, MM:SS, MM:SS.mmm, HH:MM:SS, HH:MM:SS.mmm
 * Returns null if the input cannot be parsed.
 */
export function parseTimestampToSeconds(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  // HH:MM:SS or HH:MM:SS.mmm
  const hmsMatch = trimmed.match(/^(\d+):(\d{1,2}):(\d{1,2})(?:[.,](\d+))?$/)
  if (hmsMatch) {
    const h = parseInt(hmsMatch[1], 10)
    const m = parseInt(hmsMatch[2], 10)
    const s = parseInt(hmsMatch[3], 10)
    const frac = hmsMatch[4] ? parseFloat(`0.${hmsMatch[4]}`) : 0
    if (m > 59 || s > 59) return null
    return h * 3600 + m * 60 + s + frac
  }

  // MM:SS or MM:SS.mmm
  const msMatch = trimmed.match(/^(\d+):(\d{1,2})(?:[.,](\d+))?$/)
  if (msMatch) {
    const m = parseInt(msMatch[1], 10)
    const s = parseInt(msMatch[2], 10)
    const frac = msMatch[3] ? parseFloat(`0.${msMatch[3]}`) : 0
    if (s > 59) return null
    return m * 60 + s + frac
  }

  // Plain seconds: SS or SS.mmm
  const secMatch = trimmed.match(/^(\d+)(?:[.,](\d+))?$/)
  if (secMatch) {
    const s = parseInt(secMatch[1], 10)
    const frac = secMatch[2] ? parseFloat(`0.${secMatch[2]}`) : 0
    return s + frac
  }

  return null
}

/**
 * Format seconds into a human-readable timestamp string.
 * Produces MM:SS for short values, MM:SS.SSS when milliseconds are present,
 * HH:MM:SS.SSS for values over one hour.
 */
export function formatSecondsToTimestamp(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'

  const totalMs = Math.round(seconds * 1000)
  const h = Math.floor(totalMs / 3_600_000)
  const m = Math.floor((totalMs % 3_600_000) / 60_000)
  const s = Math.floor((totalMs % 60_000) / 1_000)
  const ms = totalMs % 1_000

  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  const msStr = String(ms).padStart(3, '0')

  if (h > 0) {
    return ms > 0
      ? `${h}:${mm}:${ss}.${msStr}`
      : `${h}:${mm}:${ss}`
  }
  return ms > 0
    ? `${m}:${ss}.${msStr}`
    : `${m}:${ss}`
}

/**
 * Appropriate tick interval in seconds for a timeline of the given duration.
 */
export function tickInterval(duration: number): number {
  if (duration <= 30)  return 1
  if (duration <= 90)  return 5
  if (duration <= 300) return 15
  if (duration <= 900) return 30
  return 60
}

/**
 * Generate tick mark positions (in seconds) for a timeline.
 */
export function timelineTicks(duration: number): number[] {
  if (duration <= 0) return []
  const interval = tickInterval(duration)
  const result: number[] = []
  for (let t = 0; t <= duration; t += interval) result.push(t)
  return result
}
