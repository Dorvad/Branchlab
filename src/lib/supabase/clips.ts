'use client'

import { getSupabaseClient } from './client'
import type { Clip } from '@/types'

export const ACCEPTED_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
export const ACCEPTED_EXTENSIONS = '.mp4,.webm,.mov'
export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024 // 500 MB
const BUCKET = 'Assets'

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
    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(0)
    }
    video.src = url
  })
}

export interface UploadProgress {
  loaded: number
  total: number
}

export async function uploadClip(
  file: File,
  onProgress?: (p: UploadProgress) => void
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

  const duration = await probeVideoDuration(file)
  const ext = file.name.split('.').pop() ?? 'mp4'
  const uuid = crypto.randomUUID()
  const storagePath = `${user.id}/${uuid}.${ext}`

  // Upload to Supabase Storage using XMLHttpRequest for progress tracking
  const publicUrl = await new Promise<string>((resolve, reject) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET}/${storagePath}`

    const xhr = new XMLHttpRequest()
    xhr.open('POST', uploadUrl)
    xhr.setRequestHeader('Authorization', `Bearer ${anonKey}`)
    xhr.setRequestHeader('x-upsert', 'false')
    // Content-Type is set by the browser from FormData

    if (onProgress) {
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) onProgress({ loaded: e.loaded, total: e.total })
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const pubUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`
        resolve(pubUrl)
      } else {
        try {
          const body = JSON.parse(xhr.responseText)
          reject(new Error(body?.message ?? `Upload failed (${xhr.status})`))
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`))
        }
      }
    }
    xhr.onerror = () => reject(new Error('Network error during upload.'))

    const formData = new FormData()
    formData.append('', file)
    xhr.send(formData)
  })

  // Insert DB row
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
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  const row = data as Record<string, unknown>
  return {
    id: row.id as string,
    name: row.name as string,
    size: row.size as number,
    mimeType: row.mime_type as string,
    url: row.url as string,
    storagePath: row.storage_path as string,
    duration: row.duration as number,
    createdAt: row.created_at as string,
  }
}

export async function fetchClips(): Promise<Clip[]> {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('clips')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  if (!data) return []

  return (data as Record<string, unknown>[]).map(row => ({
    id: row.id as string,
    name: row.name as string,
    size: row.size as number,
    mimeType: row.mime_type as string,
    url: row.url as string,
    storagePath: row.storage_path as string,
    duration: row.duration as number,
    createdAt: row.created_at as string,
  }))
}

export async function deleteClip(id: string, storagePath: string): Promise<void> {
  const sb = getSupabaseClient()
  const { error: storageError } = await sb.storage.from(BUCKET).remove([storagePath])
  if (storageError) throw new Error(storageError.message)

  const { error: dbError } = await sb.from('clips').delete().eq('id', id)
  if (dbError) throw new Error(dbError.message)
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
