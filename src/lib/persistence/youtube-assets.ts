import { isSupabaseMode } from './mode'
import * as local from '@/lib/local-store/youtube-assets'
import * as remote from '@/lib/supabase/youtube-assets'
import type { YouTubeAsset } from '@/types'

export async function fetchYouTubeAssets(orgId?: string | null): Promise<YouTubeAsset[]> {
  if (isSupabaseMode()) return remote.fetchYouTubeAssets(orgId)
  return Promise.resolve(local.fetchYouTubeAssets())
}

export async function saveYouTubeAsset(
  asset: Pick<YouTubeAsset, 'youtubeVideoId' | 'originalUrl' | 'title' | 'thumbnailUrl' | 'duration'>,
  orgId?: string | null,
): Promise<YouTubeAsset> {
  if (isSupabaseMode()) return remote.saveYouTubeAsset(asset, orgId)
  return Promise.resolve(local.saveYouTubeAsset(asset))
}

export async function deleteYouTubeAsset(id: string): Promise<void> {
  if (isSupabaseMode()) return remote.deleteYouTubeAsset(id)
  return Promise.resolve(local.deleteYouTubeAsset(id))
}

export async function renameYouTubeAsset(id: string, title: string): Promise<void> {
  if (isSupabaseMode()) return remote.renameYouTubeAsset(id, title)
  return Promise.resolve(local.renameYouTubeAsset(id, title))
}
