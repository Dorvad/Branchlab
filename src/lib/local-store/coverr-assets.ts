import type { CoverrAsset } from '@/types'

const STORAGE_KEY = 'branchlab:coverr-assets'

function read(): Record<string, CoverrAsset> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, CoverrAsset>) : {}
  } catch {
    return {}
  }
}

function write(data: Record<string, CoverrAsset>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

export function fetchCoverrAssets(): CoverrAsset[] {
  return Object.values(read()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export function saveCoverrAsset(asset: Omit<CoverrAsset, 'id' | 'createdAt'>): CoverrAsset {
  const store = read()
  const existing = Object.values(store).find(a => a.coverrId === asset.coverrId)
  if (existing) return existing

  const saved: CoverrAsset = {
    ...asset,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  store[saved.id] = saved
  write(store)
  return saved
}

export function deleteCoverrAsset(id: string): void {
  const store = read()
  delete store[id]
  write(store)
}

export function renameCoverrAsset(id: string, title: string): void {
  const store = read()
  if (store[id]) {
    store[id] = { ...store[id], title }
    write(store)
  }
}
