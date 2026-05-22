'use client'

import { getSupabaseClient } from './client'
import type { Clip, ClipUploadStatus } from '@/types'

export const ACCEPTED_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
export const ACCEPTED_EXTENSIONS = '.mp4,.webm,.mov'

// ── File size limits ──────────────────────────────────────────────────────────
// Hard cap sent to the uploader. Supabase Storage enforces its own limit per plan:
//   Free plan  →  50 MB per file
//   Pro plan   →  5 GB per file
// Make sure the limit in your Supabase dashboard (Storage → Buckets → Assets → Edit)
// matches your plan. This constant reflects the Pro plan maximum.
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024 // 5 GB (Pro plan max)
export const LARGE_FILE_WARNING_BYTES = 150 * 1024 * 1024  // 150 MB — show pre-upload warning

// ── Compression thresholds ────────────────────────────────────────────────────
// Files smaller than this are uploaded as-is (compression overhead not worth it).
const COMPRESSION_MIN_BYTES = 20 * 1024 * 1024   // 20 MB
// Files larger than this are uploaded as-is. FFmpeg WASM needs to hold the input
// and output simultaneously in the browser WASM heap; beyond ~300 MB this reliably
// causes OOM errors in the browser.
const COMPRESSION_MAX_BYTES = 300 * 1024 * 1024  // 300 MB

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

// ── FFmpeg video compression ──────────────────────────────────────────────────

// Module-level singleton so the ~30 MB WASM is only loaded once per session.
let ffmpegReady: Promise<import('@ffmpeg/ffmpeg').FFmpeg> | null = null

async function loadFFmpeg(): Promise<import('@ffmpeg/ffmpeg').FFmpeg> {
  if (ffmpegReady) return ffmpegReady
  ffmpegReady = (async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg')
    const { toBlobURL } = await import('@ffmpeg/util')
    const ffmpeg = new FFmpeg()
    const ver = '0.12.6'
    const cdn = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${ver}/dist/umd`
    await ffmpeg.load({
      coreURL: await toBlobURL(`${cdn}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${cdn}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    return ffmpeg
  })()
  return ffmpegReady
}

/**
 * Re-encodes the video with H.264 CRF 26 (good quality / small size balance).
 * Scales down to a max of 1920 px wide while preserving aspect ratio.
 * Audio is re-encoded as AAC 128 kbps.
 * Returns a new File if the result is smaller; otherwise returns the original.
 */
async function compressVideo(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<File> {
  const ffmpeg = await loadFFmpeg()
  const { fetchFile } = await import('@ffmpeg/util')

  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '.mp4'
  const inName = `in${ext}`
  const outName = 'out.mp4'

  await ffmpeg.writeFile(inName, await fetchFile(file))

  const handler = ({ progress }: { progress: number }) => {
    onProgress?.(Math.min(99, Math.round(progress * 100)))
  }
  ffmpeg.on('progress', handler)

  try {
    // Race the encode against a 10-minute timeout so the UI never stalls indefinitely.
    // ultrafast is 3-5× faster than fast in WASM with negligible quality difference at CRF 26.
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Compression timed out after 10 minutes')), 10 * 60 * 1000)
    )
    const exitCode = await Promise.race([
      ffmpeg.exec([
        '-i', inName,
        '-c:v', 'libx264',
        '-crf', '26',
        '-preset', 'ultrafast',
        // Scale width to max 1920 px, auto height (divisible by 2 for H.264)
        '-vf', 'scale=w=trunc(if(gt(iw,1920),1920,iw)/2)*2:h=-2',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y', outName,
      ]),
      timeout,
    ])
    if (exitCode !== 0) throw new Error(`FFmpeg exited with code ${exitCode}`)
  } finally {
    ffmpeg.off('progress', handler)
    await ffmpeg.deleteFile(inName).catch(() => {})
  }

  const data = await ffmpeg.readFile(outName)
  await ffmpeg.deleteFile(outName).catch(() => {})

  onProgress?.(100)

  const compressed = new File(
    [(data as Uint8Array).slice()],
    file.name.replace(/\.[^.]+$/, '.mp4'),
    { type: 'video/mp4' },
  )

  // Only use the compressed version if it's valid and actually smaller
  return (compressed.size > 0 && compressed.size < file.size) ? compressed : file
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
    throw new Error('File too large. Maximum size is 5 GB.')
  }

  const sb = getSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not signed in.')

  const { data: { session } } = await sb.auth.getSession()
  if (!session?.access_token) throw new Error('No active session.')

  // ── Phase 0: compress if within the useful size range ────────────────────
  let uploadFile = file
  const shouldCompress =
    file.size >= COMPRESSION_MIN_BYTES &&
    file.size <= COMPRESSION_MAX_BYTES

  if (shouldCompress) {
    onStatus?.('compressing')
    try {
      uploadFile = await compressVideo(file, pct => {
        // Reuse onProgress to drive the compression progress bar (0–100)
        onProgress?.({ loaded: pct, total: 100 })
      })
    } catch {
      // Compression failed — fall back to original file silently
      uploadFile = file
    }
  }

  // Probe duration from the (possibly compressed) file
  const duration = await probeVideoDuration(uploadFile)
  const ext = uploadFile.name.split('.').pop() ?? 'mp4'
  const uuid = crypto.randomUUID()
  const storagePath = `${user.id}/${uuid}.${ext}`

  // ── Phase 1: upload video via XHR for progress tracking ──────────────────
  onStatus?.('uploading')
  onProgress?.({ loaded: 0, total: uploadFile.size })

  const publicUrl = await new Promise<string>((resolve, reject) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/${BUCKET}/${storagePath}`)
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
    xhr.setRequestHeader('Content-Type', uploadFile.type || 'application/octet-stream')
    xhr.setRequestHeader('x-upsert', 'false')

    if (onProgress) {
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) onProgress({ loaded: e.loaded, total: e.total })
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(`${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`)
      } else {
        try { reject(new Error(JSON.parse(xhr.responseText)?.message ?? `Upload failed (${xhr.status})`)) }
        catch { reject(new Error(`Upload failed (${xhr.status})`)) }
      }
    }
    xhr.onerror = () => reject(new Error('Network error during upload.'))

    xhr.send(uploadFile)
  })

  // ── Phase 2: generate thumbnail from original file, upload as JPEG ────────
  onStatus?.('processing')
  let thumbnailUrl: string | undefined
  try {
    const blob = await generateThumbnail(uploadFile)
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
      name: file.name, // keep original filename even if we compressed to .mp4
      size: uploadFile.size,
      mime_type: uploadFile.type,
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
