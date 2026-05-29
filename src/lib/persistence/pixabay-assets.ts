import { isSupabaseMode } from './mode'
import * as local from '@/lib/local-store/pixabay-assets'
import type { PixabayAsset } from '@/types'

export async function fetchPixabayAssets(_orgId?: string | null): Promise<PixabayAsset[]> {
  if (isSupabaseMode()) return Promise.resolve([])
  return Promise.resolve(local.fetchPixabayAssets())
}

export async function savePixabayAsset(
  asset: Omit<PixabayAsset, 'id' | 'createdAt'>,
  _orgId?: string | null,
): Promise<PixabayAsset> {
  return Promise.resolve(local.savePixabayAsset(asset))
}

export async function deletePixabayAsset(id: string): Promise<void> {
  return Promise.resolve(local.deletePixabayAsset(id))
}

export async function renamePixabayAsset(id: string, title: string): Promise<void> {
  return Promise.resolve(local.renamePixabayAsset(id, title))
}
