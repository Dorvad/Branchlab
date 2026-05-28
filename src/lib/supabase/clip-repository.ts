/**
 * Supabase clip repository.
 *
 * Handles video upload, metadata persistence, listing, and deletion.
 * NOT yet wired to the AssetLibrary UI — that happens in a later task.
 *
 * Bucket:  branchlab-clips  (must be created in Supabase Storage dashboard)
 * Path:    {userId}/{scenarioId}/{clipId}-{safeFilename}
 */

import { getSupabaseClient } from './client'
import type { Clip } from '@/types'

// ── Constants ─────────────────────────────────────────────────────────────────

export const ACCEPTED_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const
export const ACCEPTED_EXTENSIONS = '.mp4,.webm,.mov'
export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024 // 500 MB

const BUCKET = 'branchlab-clips'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strips characters that are unsafe in storage object names. */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_') // replace unsafe chars with underscore
    .replace(/__+/g, '_')              // collapse consecutive underscores
    .slice(0, 100)                     // cap length
}

function storagePath(userId: string, scenarioId: string, clipId: string, filename: string): string {
  return `${userId}/${scenarioId}/${clipId}-${sanitizeFilename(filename)}`
}

function publicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`
}

async function requireUserId(): Promise<string> {
  const { data: { user } } = await getSupabaseClient().auth.getUser()
  if (!user) throw new Error('Not signed in')
  return user.id
}

// ── Upload ────────────────────────────────────────────────────────────────────

export interface UploadProgress {
  loaded: number
  total: number
}

/**
 * Uploads a video file and inserts a metadata row in the `clips` table.
 * Returns the persisted Clip on success.
 */
export async function uploadClip(
  scenarioId: string,
  file: File,
  onProgress?: (p: UploadProgress) => void,
): Promise<Clip> {
  if (!ACCEPTED_MIME_TYPES.includes(file.type as typeof ACCEPTED_MIME_TYPES[number])) {
    throw new Error('Unsupported format. Use MP4, WebM, or MOV.')
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File too large. Maximum size is 500 MB.')
  }

  const sb = getSupabaseClient()
  const userId = await requireUserId()
  const { data: { session } } = await sb.auth.getSession()
  if (!session?.access_token) throw new Error('No active session')

  const clipId = crypto.randomUUID()
  const path = storagePath(userId, scenarioId, clipId, file.name)
  const url = publicUrl(path)

  // ── Upload via XHR for progress reporting ──────────────────────────────────
  await new Promise<void>((resolve, reject) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`)
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.setRequestHeader('x-upsert', 'false')

    if (onProgress) {
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) onProgress({ loaded: e.loaded, total: e.total })
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else {
        try { reject(new Error(JSON.parse(xhr.responseText)?.message ?? `Upload failed (${xhr.status})`)) }
        catch { reject(new Error(`Upload failed (${xhr.status})`)) }
      }
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(file)
  })

  // ── Insert metadata row ────────────────────────────────────────────────────
  const { data, error } = await sb
    .from('clips')
    .insert({
      id: clipId,
      user_id: userId,
      scenario_id: scenarioId,
      name: file.name,
      size: file.size,
      mime_type: file.type,
      url,
      storage_path: path,
      duration: 0, // caller can update via updateClipDuration() once probed
      thumbnail_url: null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return rowToClip(data as Record<string, unknown>)
}

// ── List ──────────────────────────────────────────────────────────────────────

/** Returns all clips belonging to a scenario, newest first. */
export async function listClips(scenarioId: string): Promise<Clip[]> {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('clips')
    .select('*')
    .eq('scenario_id', scenarioId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(r => rowToClip(r as Record<string, unknown>))
}

// ── Delete ────────────────────────────────────────────────────────────────────

/**
 * Deletes the metadata row then the storage object.
 * DB row is deleted first so a failed storage delete doesn't leave an orphaned row.
 */
export async function deleteClip(clipId: string, storagePath: string): Promise<void> {
  const sb = getSupabaseClient()
  const { error: dbErr } = await sb.from('clips').delete().eq('id', clipId)
  if (dbErr) throw new Error(dbErr.message)
  await sb.storage.from(BUCKET).remove([storagePath])
  // storage errors are intentionally swallowed — the row is already gone
}

// ── Optional metadata update ──────────────────────────────────────────────────

/** Updates the probed duration after upload. Fire-and-forget safe. */
export async function updateClipDuration(clipId: string, duration: number): Promise<void> {
  const sb = getSupabaseClient()
  const { error } = await sb.from('clips').update({ duration }).eq('id', clipId)
  if (error) throw new Error(error.message)
}

// ── Row mapper ────────────────────────────────────────────────────────────────

function rowToClip(row: Record<string, unknown>): Clip {
  return {
    id: row.id as string,
    name: row.name as string,
    size: row.size as number,
    mimeType: row.mime_type as string,
    url: row.url as string,
    storagePath: row.storage_path as string,
    duration: (row.duration as number) ?? 0,
    createdAt: row.created_at as string,
    thumbnailUrl: (row.thumbnail_url as string) || undefined,
  }
}
