import { isSupabaseMode } from './mode'
import * as local from '@/lib/local-store/coverr-assets'
import type { CoverrAsset } from '@/types'

export async function fetchCoverrAssets(_orgId?: string | null): Promise<CoverrAsset[]> {
  if (isSupabaseMode()) return Promise.resolve([])
  return Promise.resolve(local.fetchCoverrAssets())
}

export async function saveCoverrAsset(
  asset: Omit<CoverrAsset, 'id' | 'createdAt'>,
  _orgId?: string | null,
): Promise<CoverrAsset> {
  return Promise.resolve(local.saveCoverrAsset(asset))
}

export async function deleteCoverrAsset(id: string): Promise<void> {
  return Promise.resolve(local.deleteCoverrAsset(id))
}

export async function renameCoverrAsset(id: string, title: string): Promise<void> {
  return Promise.resolve(local.renameCoverrAsset(id, title))
}
