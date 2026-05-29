/**
 * Mode-aware clip access for the editor.
 *
 * local   → existing @/lib/supabase/clips  (Assets bucket, FFmpeg compression)
 * supabase → @/lib/supabase/clip-repository (branchlab-clips bucket, simple upload)
 */

import { isSupabaseMode } from './mode'
import * as existingClips from '@/lib/supabase/clips'
import * as clipRepo from '@/lib/supabase/clip-repository'
import type { Clip, ClipUploadStatus } from '@/types'
import type { UploadProgress } from '@/lib/supabase/clips'

/**
 * Uploads a clip.
 * local mode:    full pipeline (FFmpeg compression, thumbnail, Assets bucket)
 * supabase mode: direct upload to branchlab-clips bucket, no compression
 */
export async function uploadClip(
  scenarioId: string,
  file: File,
  onProgress?: (p: UploadProgress) => void,
  onStatus?: (status: ClipUploadStatus) => void,
  onCompressed?: (originalBytes: number, compressedBytes: number) => void,
): Promise<Clip> {
  if (isSupabaseMode()) {
    onStatus?.('uploading')
    const clip = await clipRepo.uploadClip(scenarioId, file, onProgress)
    onStatus?.('ready')
    return clip
  }
  // local: delegate to existing full-featured upload (Assets bucket + FFmpeg)
  return existingClips.uploadClip(file, onProgress, onStatus, undefined, onCompressed)
}

/**
 * Lists clips.
 * local mode:    all clips for the user (existing behaviour)
 * supabase mode: clips scoped to the given scenario
 */
export async function fetchClips(
  scenarioId: string,
  orgId?: string | null,
): Promise<Clip[]> {
  if (isSupabaseMode()) return clipRepo.listClips(scenarioId)
  return existingClips.fetchClips(orgId)
}

/**
 * Deletes a clip and its storage object.
 * Both modes delegate to their respective delete implementations.
 */
export async function deleteClip(clipId: string, storagePath: string): Promise<void> {
  if (isSupabaseMode()) return clipRepo.deleteClip(clipId, storagePath)
  return existingClips.deleteClip(clipId, storagePath)
}
