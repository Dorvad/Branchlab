import type { YouTubeAsset } from '@/types'

const STORAGE_KEY = 'branchlab:youtube-assets'

function read(): Record<string, YouTubeAsset> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, YouTubeAsset>) : {}
  } catch {
    return {}
  }
}

function write(data: Record<string, YouTubeAsset>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function fetchYouTubeAssets(): YouTubeAsset[] {
  return Object.values(read()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function saveYouTubeAsset(
  asset: Pick<YouTubeAsset, 'youtubeVideoId' | 'originalUrl' | 'title' | 'thumbnailUrl' | 'duration'>,
): YouTubeAsset {
  const store = read()
  // Deduplicate by video ID
  const existing = Object.values(store).find(a => a.youtubeVideoId === asset.youtubeVideoId)
  if (existing) return existing

  const saved: YouTubeAsset = {
    id: crypto.randomUUID(),
    youtubeVideoId: asset.youtubeVideoId,
    originalUrl: asset.originalUrl,
    title: asset.title,
    thumbnailUrl: asset.thumbnailUrl,
    duration: asset.duration,
    createdAt: new Date().toISOString(),
  }
  store[saved.id] = saved
  write(store)
  return saved
}

export function deleteYouTubeAsset(id: string): void {
  const store = read()
  delete store[id]
  write(store)
}

export function renameYouTubeAsset(id: string, title: string): void {
  const store = read()
  if (store[id]) {
    store[id] = { ...store[id], title }
    write(store)
  }
}
