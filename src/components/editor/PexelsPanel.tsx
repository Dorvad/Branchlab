'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, ExternalLink } from 'lucide-react'
import { searchPexels, bestVideoFile, asPhotos, asVideos } from '@/lib/pexels/client'
import { savePexelsAsset } from '@/lib/persistence/pexels-assets'
import { PexelsResultCard } from './PexelsResultCard'
import type { PexelsPhoto, PexelsVideo, PexelsMediaType, PexelsOrientation } from '@/lib/pexels/types'
import type { PexelsAsset } from '@/types'

interface PexelsPanelProps {
  savedPexelsIds: Set<number>
  onSaveAsset: (asset: PexelsAsset) => void
}

type ResultItem = { type: 'video'; item: PexelsVideo } | { type: 'photo'; item: PexelsPhoto }

export function PexelsPanel({ savedPexelsIds, onSaveAsset }: PexelsPanelProps) {
  const [query, setQuery] = useState('')
  const [mediaType, setMediaType] = useState<PexelsMediaType>('video')
  const [orientation, setOrientation] = useState<PexelsOrientation>('')
  const [page, setPage] = useState(1)
  const [results, setResults] = useState<ResultItem[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())
  const [localSavedIds, setLocalSavedIds] = useState<Set<number>>(new Set())

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestQueryRef = useRef('')

  const doSearch = useCallback(async (q: string, type: PexelsMediaType, orient: PexelsOrientation, pg: number, append: boolean) => {
    if (!q.trim()) return
    if (pg === 1 && !append) setLoading(true)
    else setLoadingMore(true)
    setError(null)
    try {
      const res = await searchPexels({ q, type, page: pg, orientation: orient })
      const items: ResultItem[] = type === 'video'
        ? asVideos(res).map(item => ({ type: 'video' as const, item }))
        : asPhotos(res).map(item => ({ type: 'photo' as const, item }))
      setResults(prev => append ? [...prev, ...items] : items)
      setTotalResults(res.total_results)
      setPage(pg)
    } catch {
      setError('Search failed. Check your API key or try again.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Debounced query effect
  useEffect(() => {
    latestQueryRef.current = query
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); setTotalResults(0); return }
    debounceRef.current = setTimeout(() => {
      doSearch(query, mediaType, orientation, 1, false)
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  // Re-search when filters change (only if there's already a query)
  useEffect(() => {
    if (!query.trim()) return
    doSearch(query, mediaType, orientation, 1, false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType, orientation])

  const handleLoadMore = () => {
    if (!query.trim() || loadingMore) return
    doSearch(query, mediaType, orientation, page + 1, true)
  }

  const handleSave = async (result: ResultItem) => {
    const id = result.item.id
    if (savingIds.has(id) || localSavedIds.has(id) || savedPexelsIds.has(id)) return
    setSavingIds(prev => new Set(prev).add(id))
    try {
      let assetData: Omit<PexelsAsset, 'id' | 'createdAt'>
      if (result.type === 'video') {
        const video = result.item
        const best = bestVideoFile(video)
        assetData = {
          pexelsId: video.id,
          type: 'video',
          title: `pexels-video-${video.id}`,
          url: best.link,
          thumbnailUrl: video.image,
          width: video.width,
          height: video.height,
          duration: video.duration,
          photographer: video.user.name,
          pexelsPageUrl: video.url,
        }
      } else {
        const photo = result.item as PexelsPhoto
        assetData = {
          pexelsId: photo.id,
          type: 'photo',
          title: `pexels-photo-${photo.id}`,
          url: photo.src.large,
          thumbnailUrl: photo.src.small,
          width: photo.width,
          height: photo.height,
          photographer: photo.photographer,
          pexelsPageUrl: photo.url,
        }
      }
      const saved = await savePexelsAsset(assetData)
      onSaveAsset(saved)
      setLocalSavedIds(prev => new Set(prev).add(id))
    } catch {
      // silently fail — user can retry
    } finally {
      setSavingIds(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  const hasMore = results.length < totalResults

  return (
    <div className="flex flex-col h-full">

      {/* Search input */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search
            size={11}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--fg-4)' }}
          />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search stock footage & photos…"
            className="w-full pl-7 pr-3 py-1.5 rounded-lg text-[11px] outline-none transition-colors"
            style={{ background: 'var(--tint-1)', border: '1px solid var(--line-2)', color: 'var(--fg-1)' }}
          />
        </div>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-1.5 px-3 pb-2 flex-wrap">
        {/* Media type */}
        {(['video', 'photo'] as PexelsMediaType[]).map(t => (
          <button
            key={t}
            onClick={() => setMediaType(t)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all capitalize"
            style={{
              background: mediaType === t ? 'oklch(82% 0.18 165 / 0.12)' : 'var(--tint-2)',
              border: `1px solid ${mediaType === t ? 'oklch(82% 0.18 165 / 0.35)' : 'var(--line-1)'}`,
              color: mediaType === t ? 'oklch(82% 0.18 165)' : 'var(--fg-3)',
            }}
          >
            {t}
          </button>
        ))}
        <div className="w-px h-4 mx-0.5" style={{ background: 'var(--line-2)' }} />
        {/* Orientation filters */}
        {(['landscape', 'portrait', 'square'] as PexelsOrientation[]).map(o => (
          <button
            key={o}
            onClick={() => setOrientation(prev => prev === o ? '' : o)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all capitalize"
            style={{
              background: orientation === o ? 'var(--tint-3)' : 'var(--tint-2)',
              border: `1px solid ${orientation === o ? 'var(--line-3)' : 'var(--line-1)'}`,
              color: orientation === o ? 'var(--fg-1)' : 'var(--fg-4)',
            }}
          >
            {o}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">

        {/* Empty / pre-search state */}
        {!query.trim() && (
          <div className="py-10 text-center">
            <Search size={22} className="mx-auto mb-3 opacity-15" style={{ color: 'var(--fg-2)' }} />
            <p className="text-[11px] font-mono" style={{ color: 'var(--fg-4)' }}>
              Search for footage and photos
            </p>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden animate-pulse"
                style={{ background: 'var(--tint-2)', border: '1px solid var(--line-1)' }}
              >
                <div className="aspect-video" style={{ background: 'var(--tint-3)' }} />
                <div className="px-2 py-1.5">
                  <div className="h-2 rounded w-2/3" style={{ background: 'var(--tint-3)' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="py-6 px-3 text-center">
            <p className="text-[11px]" style={{ color: 'oklch(70% 0.18 25)' }}>{error}</p>
          </div>
        )}

        {/* No results */}
        {!loading && !error && query.trim() && results.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-[11px] font-mono" style={{ color: 'var(--fg-4)' }}>
              No results for &ldquo;{query}&rdquo;
            </p>
          </div>
        )}

        {/* Grid */}
        {!loading && results.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {results.map(r => (
              <PexelsResultCard
                key={`${r.type}-${r.item.id}`}
                item={r.item}
                type={r.type}
                isSaving={savingIds.has(r.item.id)}
                isSaved={localSavedIds.has(r.item.id) || savedPexelsIds.has(r.item.id)}
                onSave={() => handleSave(r)}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {!loading && hasMore && results.length > 0 && (
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="w-full mt-3 py-2 rounded-xl text-[11px] font-mono transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: 'var(--tint-2)', border: '1px solid var(--line-2)', color: 'var(--fg-2)' }}
          >
            {loadingMore ? 'Loading…' : `Load more (${totalResults - results.length} left)`}
          </button>
        )}
      </div>

      {/* Attribution footer — required by Pexels ToS */}
      <div
        className="flex items-center justify-center gap-1.5 px-3 py-2 border-t shrink-0"
        style={{ borderColor: 'var(--line-1)' }}
      >
        <a
          href="https://www.pexels.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[9px] font-mono transition-colors hover:opacity-80"
          style={{ color: 'var(--fg-4)' }}
        >
          Media provided by Pexels
          <ExternalLink size={8} />
        </a>
      </div>
    </div>
  )
}
