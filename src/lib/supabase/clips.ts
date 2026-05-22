'use client'

import { getSupabaseClient } from './client'
import type { Clip, ClipUploadStatus } from '@/types'

export const ACCEPTED_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
export const ACCEPTED_EXTENSIONS = '.mp4,.webm,.mov'
export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024 // 500 MB
export const LARGE_FILE_WARNING_BYTES = 150 * 1024 * 1024 // 150 MB — show warning, don't block
const BUCKET = 'Assets'

export interface UploadProgress {
  loaded: number
  total: number
}

// ── Internal utilities ────────────────────────────────────────────────────────

function probeVideoDuration(file: File): Promise<number> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const d = isFinite(video.duration) ? Math.round(video.duration) : 0
      video.src = ''
      URL.revokeObjectURL(url)
      resolve(d)
    }
    video.onerror = () => { URL.revokeObjectURL(url); resolve(0) }
    video.src = url
  })
}

function generateThumbnail(file: File): Promise<Blob | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    const cleanup = () => { video.src = ''; URL.revokeObjectURL(url) }

    video.onloadedmetadata = () => {
      // Seek to 10% of duration (or 1 s, whichever is earlier) for a representative frame
      video.currentTime = Math.min(1, video.duration * 0.1)
    }

    video.onseeked = () => {
      try {
        const W = 640
        const H = video.videoHeight > 0 ? Math.round(W * (video.videoHeight / video.videoWidth)) : 360
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d')
        if (!ctx) { cleanup(); resolve(null); return }
        ctx.drawImage(video, 0, 0, W, H)
        canvas.toBlob(blob => { cleanup(); resolve(blob) }, 'image/jpeg', 0.82)
      } catch { cleanup(); resolve(null) }
    }

    video.onerror = () => { cleanup(); resolve(null) }
    video.src = url
  })
}

/** Derives the thumbnail storage path from the video storage path. */
function thumbPath(videoStoragePath: string): string {
  const slash = videoStoragePath.lastIndexOf('/')
  const dir = videoStoragePath.slice(0, slash + 1)
  const file = videoStoragePath.slice(slash + 1)
  const stem = file.includes('.') ? file.slice(0, file.lastIndexOf('.')) : file
  return `${dir}${stem}-thumb.jpg`
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function uploadClip(
  file: File,
  onProgress?: (p: UploadProgress) => void,
  onStatus?: (status: ClipUploadStatus) => void,
): Promise<Clip> {
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    throw new Error('Unsupported format. Use MP4, WebM, or MOV.')
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File too large. Maximum size is 500 MB.')
  }

  const sb = getSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not signed in.')

  const { data: { session } } = await sb.auth.getSession()
  if (!session?.access_token) throw new Error('No active session.')

  // Probe duration before upload so the UI can show it early
  const duration = await probeVideoDuration(file)
  const ext = file.name.split('.').pop() ?? 'mp4'
  const uuid = crypto.randomUUID()
  const storagePath = `${user.id}/${uuid}.${ext}`

  // ── Phase 1: upload video via XHR for progress tracking ──────────────────
  onStatus?.('uploading')
  const publicUrl = await new Promise<string>((resolve, reject) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/${BUCKET}/${storagePath}`)
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
    xhr.setRequestHeader('x-upsert', 'false')

    if (onProgress) {
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) onProgress({ loaded: e.loaded, total: e.total })
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`)
      } else {
        try { reject(new Error(JSON.parse(xhr.responseText)?.message ?? `Upload failed (${xhr.status})`)) }
        catch { reject(new Error(`Upload failed (${xhr.status})`)) }
      }
    }
    xhr.onerror = () => reject(new Error('Network error during upload.'))

    const fd = new FormData()
    fd.append('', file)
    xhr.send(fd)
  })

  // ── Phase 2: generate thumbnail from local file, upload as JPEG ───────────
  onStatus?.('processing')
  let thumbnailUrl: string | undefined
  try {
    const blob = await generateThumbnail(file)
    if (blob) {
      const tp = thumbPath(storagePath)
      const { error } = await sb.storage.from(BUCKET).upload(tp, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      })
      if (!error) {
        thumbnailUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${tp}`
      }
    }
  } catch { /* thumbnail is optional — never fail the upload */ }

  // ── Phase 3: insert DB row ────────────────────────────────────────────────
  const { data, error } = await sb
    .from('clips')
    .insert({
      user_id: user.id,
      name: file.name,
      size: file.size,
      mime_type: file.type,
      url: publicUrl,
      storage_path: storagePath,
      duration,
      thumbnail_url: thumbnailUrl ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  onStatus?.('ready')
  const row = data as Record<string, unknown>
  return rowToClip(row)
}

export async function fetchClips(): Promise<Clip[]> {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('clips')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(r => rowToClip(r as Record<string, unknown>))
}

export async function deleteClip(id: string, storagePath: string): Promise<void> {
  const sb = getSupabaseClient()
  // DB row first — if this fails we throw and nothing is deleted
  const { error } = await sb.from('clips').delete().eq('id', id)
  if (error) throw new Error(error.message)
  // Storage cleanup after the DB delete confirms; ignore storage errors
  // (files may already be gone, or paths may not exist for old clips)
  await sb.storage.from(BUCKET).remove([storagePath, thumbPath(storagePath)])
}

// ── Formatters ────────────────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── Internal mapper ───────────────────────────────────────────────────────────

function rowToClip(row: Record<string, unknown>): Clip {
  return {
    id: row.id as string,
    name: row.name as string,
    size: row.size as number,
    mimeType: row.mime_type as string,
    url: row.url as string,
    storagePath: row.storage_path as string,
    duration: row.duration as number,
    createdAt: row.created_at as string,
    thumbnailUrl: (row.thumbnail_url as string) || undefined,
  }
}
