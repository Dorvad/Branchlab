'use client'

import { getSupabaseClient } from './client'
import type { Clip, ClipUploadStatus } from '@/types'

export const ACCEPTED_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
export const ACCEPTED_EXTENSIONS = '.mp4,.webm,.mov'

// ── File size limits ──────────────────────────────────────────────────────────
// Supabase free plan: 50 MB per file hard limit.
// We accept up to 200 MB as input; everything ≥ 5 MB is compressed to fit.
// FFmpeg WASM must hold input + output in the browser heap simultaneously —
// beyond ~200 MB this causes OOM errors on low-RAM devices, so we reject above that.
export const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024  // 200 MB input ceiling
export const LARGE_FILE_WARNING_BYTES = 30 * 1024 * 1024  // 30 MB — show pre-upload warning

// ── Compression thresholds ────────────────────────────────────────────────────
// Compress aggressively for MVP storage budget.
const COMPRESSION_MIN_BYTES = 5 * 1024 * 1024    // 5 MB — compress anything this large
const COMPRESSION_MAX_BYTES = 200 * 1024 * 1024  // 200 MB (WASM heap ceiling)

// Target output size — well under the 50 MB Supabase free-plan ceiling and
// small enough to keep total storage usage low during the MVP period.
const UPLOAD_TARGET_BYTES = 20 * 1024 * 1024  // 20 MB

const BUCKET = 'Assets'

export interface UploadProgress {
  loaded: number
  total: number
}

// ── Internal utilities ────────────────────────────────────────────────────────

export function probeVideoDuration(file: File): Promise<number> {
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
 * Re-encodes the video targeting UPLOAD_TARGET_BYTES output size.
 * Uses duration-aware ABR: calculates the exact video bitrate needed so the
 * output stays under the 47 MB free-plan ceiling regardless of source length.
 * Scales down to 1280 px wide max and encodes with H.264 ultrafast preset.
 * Returns a new File if the result is valid and smaller; otherwise the original.
 */
async function compressVideo(
  file: File,
  duration: number,
  onProgress?: (pct: number) => void,
): Promise<File> {
  const ffmpeg = await loadFFmpeg()
  const { fetchFile } = await import('@ffmpeg/util')

  // Calculate bitrate to hit UPLOAD_TARGET_BYTES.
  // Reserve 64 kbps for audio (adequate for voice/narration); give the rest to video.
  // Floor at 100 kbps so very long clips still encode (quality will be low but playable).
  const AUDIO_KBPS = 64
  const safeDuration = Math.max(duration, 1)
  const videoBitrateKbps = Math.max(
    100,
    Math.floor((UPLOAD_TARGET_BYTES * 8 - AUDIO_KBPS * 1000 * safeDuration) / safeDuration / 1000),
  )

  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '.mp4'
  const inName = `in${ext}`
  const outName = 'out.mp4'

  await ffmpeg.writeFile(inName, await fetchFile(file))

  const handler = ({ progress }: { progress: number }) => {
    onProgress?.(Math.min(99, Math.round(progress * 100)))
  }
  ffmpeg.on('progress', handler)

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Compression timed out after 10 minutes')), 10 * 60 * 1000)
    )
    const exitCode = await Promise.race([
      ffmpeg.exec([
        '-i', inName,
        '-c:v', 'libx264',
        '-b:v', `${videoBitrateKbps}k`,
        '-maxrate', `${videoBitrateKbps * 2}k`,
        '-bufsize', `${videoBitrateKbps * 4}k`,
        '-preset', 'ultrafast',
        // Scale to max 720 px wide — sufficient for mobile-first player, greatly reduces file size
        '-vf', 'scale=w=trunc(if(gt(iw,720),720,iw)/2)*2:h=-2',
        '-c:a', 'aac',
        '-b:a', `${AUDIO_KBPS}k`,
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
  orgId?: string | null,
  onCompressed?: (originalBytes: number, compressedBytes: number) => void,
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

  // Probe duration up-front — needed for bitrate calculation before compression.
  const duration = await probeVideoDuration(file)

  // ── Phase 0: compress if within the useful size range ────────────────────
  let uploadFile = file
  const shouldCompress =
    file.size >= COMPRESSION_MIN_BYTES &&
    file.size <= COMPRESSION_MAX_BYTES &&
    duration > 0  // skip if probe failed — can't calculate target bitrate

  if (shouldCompress) {
    onStatus?.('compressing')
    try {
      uploadFile = await compressVideo(file, duration, pct => {
        onProgress?.({ loaded: pct, total: 100 })
      })
      if (uploadFile !== file && uploadFile.size < file.size) {
        onCompressed?.(file.size, uploadFile.size)
      }
    } catch {
      // Compression failed — fall back to original file
      uploadFile = file
    }
  }

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
  const clipRow: Record<string, unknown> = {
    user_id: user.id,
    name: file.name, // keep original filename even if we compressed to .mp4
    size: uploadFile.size,
    mime_type: uploadFile.type,
    url: publicUrl,
    storage_path: storagePath,
    duration,
    thumbnail_url: thumbnailUrl ?? null,
  }
  // Only include org_id when set — avoids breaking on DBs where the migration
  // adding this column hasn't been applied yet.
  if (orgId) clipRow.org_id = orgId

  const { data, error } = await sb
    .from('clips')
    .insert(clipRow)
    .select()
    .single()

  if (error) throw new Error(error.message)

  onStatus?.('ready')
  const row = data as Record<string, unknown>
  return rowToClip(row)
}

export async function fetchClips(orgId?: string | null): Promise<Clip[]> {
  const sb = getSupabaseClient()
  let query = sb.from('clips').select('*').order('created_at', { ascending: false })

  if (orgId) {
    query = query.eq('org_id', orgId)
  }
  // When no orgId, return all clips the user can see — avoids referencing
  // org_id IS NULL when the column may not exist yet (migration not applied).

  const { data, error } = await query
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

// ── Upload from raw buffer (used by ZIP import — skips FFmpeg compression) ────

export async function uploadClipFromBuffer(
  buffer: Uint8Array,
  fileName: string,
  mimeType: string,
  duration: number,
): Promise<Clip> {
  const sb = getSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not signed in.')

  const { data: { session } } = await sb.auth.getSession()
  if (!session?.access_token) throw new Error('No active session.')

  const ext = fileName.split('.').pop() ?? 'mp4'
  const uuid = crypto.randomUUID()
  const storagePath = `${user.id}/${uuid}.${ext}`

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const publicUrl = await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/${BUCKET}/${storagePath}`)
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
    xhr.setRequestHeader('Content-Type', mimeType || 'video/mp4')
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(`${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`)
      } else {
        try { reject(new Error(JSON.parse(xhr.responseText)?.message ?? `Upload failed (${xhr.status})`)) }
        catch { reject(new Error(`Upload failed (${xhr.status})`)) }
      }
    }
    xhr.onerror = () => reject(new Error('Network error during upload.'))
    xhr.send(buffer.buffer as ArrayBuffer)
  })

  const { data, error } = await sb
    .from('clips')
    .insert({
      user_id: user.id,
      name: fileName,
      size: buffer.byteLength,
      mime_type: mimeType,
      url: publicUrl,
      storage_path: storagePath,
      duration,
      thumbnail_url: null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return rowToClip(data as Record<string, unknown>)
}

export async function renameClip(id: string, name: string): Promise<void> {
  const sb = getSupabaseClient()
  const { error } = await sb.from('clips').update({ name }).eq('id', id)
  if (error) throw new Error(error.message)
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
