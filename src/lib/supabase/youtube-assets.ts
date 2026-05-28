import { getSupabaseClient } from '@/lib/supabase/client'
import type { YouTubeAsset } from '@/types'

// ── Row ↔ Type mapping ────────────────────────────────────────────────────────

interface YouTubeAssetRow {
  id: string
  user_id: string
  org_id: string | null
  youtube_video_id: string
  original_url: string
  title: string | null
  thumbnail_url: string | null
  duration: number | null
  created_at: string
}

function rowToAsset(row: YouTubeAssetRow): YouTubeAsset {
  return {
    id: row.id,
    youtubeVideoId: row.youtube_video_id,
    originalUrl: row.original_url,
    title: row.title ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    duration: row.duration,
    createdAt: row.created_at,
  }
}

// ── Public functions ──────────────────────────────────────────────────────────

export async function fetchYouTubeAssets(orgId?: string | null): Promise<YouTubeAsset[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('youtube_assets')
    .select('*')
    .order('created_at', { ascending: false })

  if (orgId) {
    query = query.eq('org_id', orgId)
  } else {
    // Personal assets: scoped to current user, no org
    const { data: { user } } = await supabase.auth.getUser()
    if (user) query = query.eq('user_id', user.id).is('org_id', null)
    else return []
  }

  const { data, error } = await query
  if (error) throw error
  return (data as YouTubeAssetRow[]).map(rowToAsset)
}

export async function saveYouTubeAsset(
  asset: Pick<YouTubeAsset, 'youtubeVideoId' | 'originalUrl' | 'title' | 'thumbnailUrl' | 'duration'>,
  orgId?: string | null,
): Promise<YouTubeAsset> {
  const supabase = getSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Check for duplicate within the same org first
  let dupQuery = supabase
    .from('youtube_assets')
    .select('*')
    .eq('youtube_video_id', asset.youtubeVideoId)

  if (orgId) dupQuery = dupQuery.eq('org_id', orgId)
  else dupQuery = dupQuery.is('org_id', null)

  const { data: existing } = await dupQuery.maybeSingle()
  if (existing) return rowToAsset(existing as YouTubeAssetRow)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('youtube_assets')
    .insert({
      user_id: user.id,
      org_id: orgId ?? null,
      youtube_video_id: asset.youtubeVideoId,
      original_url: asset.originalUrl,
      title: asset.title ?? null,
      thumbnail_url: asset.thumbnailUrl ?? null,
      duration: asset.duration ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return rowToAsset(data as YouTubeAssetRow)
}

export async function renameYouTubeAsset(id: string, title: string): Promise<void> {
  const supabase = getSupabaseClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('youtube_assets').update({ title }).eq('id', id)
  if (error) throw error
}

export async function deleteYouTubeAsset(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('youtube_assets').delete().eq('id', id)
  if (error) throw error
}
