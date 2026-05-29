'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, ExternalLink } from 'lucide-react'
import { searchPixabay, bestVideoFile, videoThumbnail } from '@/lib/pixabay/client'
import { savePixabayAsset } from '@/lib/persistence/pixabay-assets'
import { PixabayResultCard } from './PixabayResultCard'
import type { PixabayImage, PixabayVideo, PixabayMediaType, PixabayOrientation, PixabayImageType } from '@/lib/pixabay/types'
import type { PixabayAsset } from '@/types'

interface PixabayPanelProps {
  savedPixabayIds: Set<number>
  onSaveAsset: (asset: PixabayAsset) => void
}

type ResultItem = { type: 'video'; item: PixabayVideo } | { type: 'image'; item: PixabayImage }

export function PixabayPanel({ savedPixabayIds, onSaveAsset }: PixabayPanelProps) {
  const [query, setQuery] = useState('')
  const [mediaType, setMediaType] = useState<PixabayMediaType>('video')
  const [orientation, setOrientation] = useState<PixabayOrientation>('all')
  const [imageType, setImageType] = useState<PixabayImageType>('all')
  const [page, setPage] = useState(1)
  const [totalHits, setTotalHits] = useState(0)
  const [results, setResults] = useState<ResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())
  const [localSavedIds, setLocalSavedIds] = useState<Set<number>>(new Set())

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (
    q: string, type: PixabayMediaType, orient: PixabayOrientation,
    imgType: PixabayImageType, pg: number, append: boolean,
  ) => {
    if (!q.trim()) return
    if (!append) setLoading(true)
    else setLoadingMore(true)
    setError(null)
    try {
      const res = await searchPixabay({ q, type, page: pg, orientation: orient, imageType: imgType })
      const items: ResultItem[] = type === 'video'
        ? (res.hits as PixabayVideo[]).map(item => ({ type: 'video' as const, item }))
        : (res.hits as PixabayImage[]).map(item => ({ type: 'image' as const, item }))
      setResults(prev => append ? [...prev, ...items] : items)
      setTotalHits(res.totalHits)
      setPage(pg)
    } catch {
      setError('Search failed. Check your API key or try again.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); setTotalHits(0); return }
    debounceRef.current = setTimeout(() => {
      doSearch(query, mediaType, orientation, imageType, 1, false)
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  useEffect(() => {
    if (!query.trim()) return
    doSearch(query, mediaType, orientation, imageType, 1, false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType, orientation, imageType])

  const handleLoadMore = () => {
    if (!query.trim() || loadingMore) return
    doSearch(query, mediaType, orientation, imageType, page + 1, true)
  }

  const handleSave = async (result: ResultItem) => {
    const id = result.item.id
    if (savingIds.has(id) || localSavedIds.has(id) || savedPixabayIds.has(id)) return
    setSavingIds(prev => new Set(prev).add(id))
    try {
      let assetData: Omit<PixabayAsset, 'id' | 'createdAt'>
      if (result.type === 'video') {
        const video = result.item
        const best = bestVideoFile(video)
        assetData = {
          pixabayId: video.id,
          type: 'video',
          title: `pixabay-video-${video.id}`,
          url: best.url,
          thumbnailUrl: videoThumbnail(video),
          width: best.width,
          height: best.height,
          duration: video.duration,
          user: video.user,
          pageURL: video.pageURL,
        }
      } else {
        const image = result.item as PixabayImage
        assetData = {
          pixabayId: image.id,
          type: 'image',
          title: `pixabay-image-${image.id}`,
          url: image.largeImageURL,
          thumbnailUrl: image.previewURL,
          width: image.imageWidth,
          height: image.imageHeight,
          user: image.user,
          pageURL: image.pageURL,
          imageType: image.type,
        }
      }
      const saved = await savePixabayAsset(assetData)
      onSaveAsset(saved)
      setLocalSavedIds(prev => new Set(prev).add(id))
    } catch {
      // silently fail
    } finally {
      setSavingIds(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  const hasMore = results.length < totalHits

  return (
    <div className="flex flex-col h-full">

      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--fg-4)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search Pixabay footage & images…"
            className="w-full pl-7 pr-3 py-1.5 rounded-lg text-[11px] outline-none transition-colors"
            style={{ background: 'var(--tint-1)', border: '1px solid var(--line-2)', color: 'var(--fg-1)' }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 px-3 pb-2 flex-wrap">
        {(['video', 'image'] as PixabayMediaType[]).map(t => (
          <button
            key={t}
            onClick={() => { setMediaType(t); setOrientation('all'); setImageType('all') }}
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
        {/* Orientation */}
        {(['horizontal', 'vertical'] as const).map(o => (
          <button
            key={o}
            onClick={() => setOrientation(prev => prev === o ? 'all' : o)}
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
        {/* Image-type filter (images only) */}
        {mediaType === 'image' && (
          <>
            <div className="w-px h-4 mx-0.5" style={{ background: 'var(--line-2)' }} />
            {(['photo', 'illustration', 'vector'] as const).map(it => (
              <button
                key={it}
                onClick={() => setImageType(prev => prev === it ? 'all' : it)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all capitalize"
                style={{
                  background: imageType === it ? 'var(--tint-3)' : 'var(--tint-2)',
                  border: `1px solid ${imageType === it ? 'var(--line-3)' : 'var(--line-1)'}`,
                  color: imageType === it ? 'var(--fg-1)' : 'var(--fg-4)',
                }}
              >
                {it}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">

        {!query.trim() && (
          <div className="py-10 text-center">
            <Search size={22} className="mx-auto mb-3 opacity-15" style={{ color: 'var(--fg-2)' }} />
            <p className="text-[11px] font-mono" style={{ color: 'var(--fg-4)' }}>Search Pixabay footage & images</p>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ background: 'var(--tint-2)', border: '1px solid var(--line-1)' }}>
                <div className="aspect-video" style={{ background: 'var(--tint-3)' }} />
                <div className="px-2 py-1.5"><div className="h-2 rounded w-1/2" style={{ background: 'var(--tint-3)' }} /></div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="py-6 px-3 text-center">
            <p className="text-[11px]" style={{ color: 'oklch(70% 0.18 25)' }}>{error}</p>
          </div>
        )}

        {!loading && !error && query.trim() && results.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-[11px] font-mono" style={{ color: 'var(--fg-4)' }}>No results for &ldquo;{query}&rdquo;</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {results.map(r => (
              <PixabayResultCard
                key={`${r.type}-${r.item.id}`}
                item={r.item}
                type={r.type}
                isSaving={savingIds.has(r.item.id)}
                isSaved={localSavedIds.has(r.item.id) || savedPixabayIds.has(r.item.id)}
                onSave={() => handleSave(r)}
              />
            ))}
          </div>
        )}

        {!loading && hasMore && results.length > 0 && (
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="w-full mt-3 py-2 rounded-xl text-[11px] font-mono transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: 'var(--tint-2)', border: '1px solid var(--line-2)', color: 'var(--fg-2)' }}
          >
            {loadingMore ? 'Loading…' : `Load more (${totalHits - results.length} left)`}
          </button>
        )}
      </div>

      {/* Attribution footer */}
      <div
        className="flex items-center justify-center gap-1.5 px-3 py-2 border-t shrink-0"
        style={{ borderColor: 'var(--line-1)' }}
      >
        <a
          href="https://pixabay.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[9px] font-mono transition-colors hover:opacity-80"
          style={{ color: 'var(--fg-4)' }}
        >
          Media provided by Pixabay
          <ExternalLink size={8} />
        </a>
      </div>
    </div>
  )
}
