import { isSupabaseMode } from './mode'
import * as local from '@/lib/local-store/pexels-assets'
import type { PexelsAsset } from '@/types'

export async function fetchPexelsAssets(_orgId?: string | null): Promise<PexelsAsset[]> {
  if (isSupabaseMode()) {
    // Supabase implementation to be wired when supabase mode ships
    return Promise.resolve([])
  }
  return Promise.resolve(local.fetchPexelsAssets())
}

export async function savePexelsAsset(
  asset: Omit<PexelsAsset, 'id' | 'createdAt'>,
  _orgId?: string | null,
): Promise<PexelsAsset> {
  if (isSupabaseMode()) {
    return Promise.resolve(local.savePexelsAsset(asset))
  }
  return Promise.resolve(local.savePexelsAsset(asset))
}

export async function deletePexelsAsset(id: string): Promise<void> {
  if (isSupabaseMode()) {
    return Promise.resolve(local.deletePexelsAsset(id))
  }
  return Promise.resolve(local.deletePexelsAsset(id))
}

export async function renamePexelsAsset(id: string, title: string): Promise<void> {
  if (isSupabaseMode()) {
    return Promise.resolve(local.renamePexelsAsset(id, title))
  }
  return Promise.resolve(local.renamePexelsAsset(id, title))
}
