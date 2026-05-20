// Module-level singleton for video clips.
// Object URLs survive React re-renders and client-side navigations.
// They are reset on full page refresh — that is expected for this prototype.

import type { VideoClip } from '@/types'

export const ACCEPTED_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
export const ACCEPTED_EXTENSIONS = '.mp4,.webm,.mov'
export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024 // 500 MB

const _store = new Map<string, VideoClip>()
let _nonce = 0

function uid(): string {
  return `clip-${Date.now()}-${++_nonce}`
}

export function addClip(clip: VideoClip): void {
  _store.set(clip.id, clip)
}

export function getClip(id: string): VideoClip | null {
  return _store.get(id) ?? null
}

export function getAllClips(): VideoClip[] {
  return [..._store.values()].sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  )
}

export function removeClip(id: string): void {
  const clip = _store.get(id)
  if (clip) URL.revokeObjectURL(clip.objectUrl)
  _store.delete(id)
}

export function createClipFromFile(file: File): Promise<VideoClip> {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      reject(new Error('Unsupported format. Use MP4, WebM, or MOV.'))
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      reject(new Error('File too large. Maximum size is 500 MB.'))
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      const duration = isFinite(video.duration) ? Math.round(video.duration) : 0
      video.src = ''
      const clip: VideoClip = {
        id: uid(),
        name: file.name,
        size: file.size,
        mimeType: file.type,
        objectUrl,
        duration,
        addedAt: new Date().toISOString(),
      }
      resolve(clip)
    }

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not read video file.'))
    }

    video.src = objectUrl
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
