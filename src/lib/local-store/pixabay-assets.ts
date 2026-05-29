import type { PixabayAsset } from '@/types'

const STORAGE_KEY = 'branchlab:pixabay-assets'

function read(): Record<string, PixabayAsset> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, PixabayAsset>) : {}
  } catch {
    return {}
  }
}

function write(data: Record<string, PixabayAsset>): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
}

export function fetchPixabayAssets(): PixabayAsset[] {
  return Object.values(read()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export function savePixabayAsset(asset: Omit<PixabayAsset, 'id' | 'createdAt'>): PixabayAsset {
  const store = read()
  const existing = Object.values(store).find(
    a => a.pixabayId === asset.pixabayId && a.type === asset.type,
  )
  if (existing) return existing

  const saved: PixabayAsset = { ...asset, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
  store[saved.id] = saved
  write(store)
  return saved
}

export function deletePixabayAsset(id: string): void {
  const store = read()
  delete store[id]
  write(store)
}

export function renamePixabayAsset(id: string, title: string): void {
  const store = read()
  if (store[id]) { store[id] = { ...store[id], title }; write(store) }
}
