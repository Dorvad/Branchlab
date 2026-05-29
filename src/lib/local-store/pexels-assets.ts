import type { PexelsAsset } from '@/types'

const STORAGE_KEY = 'branchlab:pexels-assets'

function read(): Record<string, PexelsAsset> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, PexelsAsset>) : {}
  } catch {
    return {}
  }
}

function write(data: Record<string, PexelsAsset>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

export function fetchPexelsAssets(): PexelsAsset[] {
  return Object.values(read()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export function savePexelsAsset(
  asset: Omit<PexelsAsset, 'id' | 'createdAt'>,
): PexelsAsset {
  const store = read()
  // Deduplicate on pexelsId + type
  const existing = Object.values(store).find(
    a => a.pexelsId === asset.pexelsId && a.type === asset.type,
  )
  if (existing) return existing

  const saved: PexelsAsset = {
    ...asset,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  store[saved.id] = saved
  write(store)
  return saved
}

export function deletePexelsAsset(id: string): void {
  const store = read()
  delete store[id]
  write(store)
}

export function renamePexelsAsset(id: string, title: string): void {
  const store = read()
  if (store[id]) {
    store[id] = { ...store[id], title }
    write(store)
  }
}
