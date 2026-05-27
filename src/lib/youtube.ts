/**
 * Extract a YouTube video ID from any common YouTube URL format.
 * Returns null if the URL is not a recognisable YouTube video URL.
 *
 * Supports:
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtu.be/VIDEO_ID
 *   https://www.youtube.com/embed/VIDEO_ID
 *   https://www.youtube.com/shorts/VIDEO_ID
 *   https://youtube.com/watch?v=VIDEO_ID&t=30s
 *   https://m.youtube.com/watch?v=VIDEO_ID
 *   https://youtu.be/VIDEO_ID?si=abc123
 */
export function extractYouTubeVideoId(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  // Must at least look like a YouTube-domain URL or youtu.be
  if (!/youtu(?:\.be|be\.com)/i.test(trimmed)) return null

  // Match the 11-char video ID after common path patterns or v= param
  const match = trimmed.match(
    /(?:v=|youtu\.be\/|\/embed\/|\/shorts\/|\/v\/)([A-Za-z0-9_-]{11})/
  )
  return match ? match[1] : null
}

// ── YouTube IFrame API loader ─────────────────────────────────────────────────

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<typeof YT> | null = null

/**
 * Load the YouTube IFrame Player API exactly once.
 * Safe to call from multiple components simultaneously.
 * SSR-safe: returns a rejected promise if window is unavailable.
 */
export function loadYouTubeIframeAPI(): Promise<typeof YT> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube IFrame API requires a browser environment'))
  }

  if (apiPromise) return apiPromise

  apiPromise = new Promise<typeof YT>((resolve, reject) => {
    // Already loaded
    if (window.YT?.Player) {
      resolve(window.YT)
      return
    }

    // Chain with any pre-existing ready callback
    const previousCallback = window.onYouTubeIframeAPIReady

    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === 'function') previousCallback()
      resolve(window.YT)
    }

    // Append script if not already present
    if (!document.querySelector("script[src='https://www.youtube.com/iframe_api']")) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      script.onerror = () => {
        apiPromise = null
        reject(new Error('Failed to load YouTube IFrame API'))
      }
      document.body.appendChild(script)
    }
  })

  return apiPromise
}
