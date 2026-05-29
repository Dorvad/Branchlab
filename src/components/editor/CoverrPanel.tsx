'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, ExternalLink } from 'lucide-react'
import { searchCoverr } from '@/lib/coverr/client'
import { saveCoverrAsset } from '@/lib/persistence/coverr-assets'
import { CoverrResultCard } from './CoverrResultCard'
import type { CoverrVideoHit } from '@/lib/coverr/types'
import type { CoverrAsset } from '@/types'

interface CoverrPanelProps {
  savedCoverrIds: Set<string>
  onSaveAsset: (asset: CoverrAsset) => void
}

export function CoverrPanel({ savedCoverrIds, onSaveAsset }: CoverrPanelProps) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalResults, setTotalResults] = useState(0)
  const [results, setResults] = useState<CoverrVideoHit[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [localSavedIds, setLocalSavedIds] = useState<Set<string>>(new Set())

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (q: string, pg: number, append: boolean) => {
    if (!q.trim()) return
    if (!append) setLoading(true)
    else setLoadingMore(true)
    setError(null)
    try {
      const res = await searchCoverr({ q, page: pg })
      setResults(prev => append ? [...prev, ...res.hits] : res.hits)
      setPage(pg)
      setTotalPages(res.pages)
      setTotalResults(res.total)
    } catch {
      setError('Search failed. Check your API key or try again.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); setTotalResults(0); setTotalPages(0); return }
    debounceRef.current = setTimeout(() => {
      doSearch(query, 0, false)
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const handleLoadMore = () => {
    if (!query.trim() || loadingMore || page + 1 >= totalPages) return
    doSearch(query, page + 1, true)
  }

  const handleSave = async (video: CoverrVideoHit) => {
    if (savingIds.has(video.id) || localSavedIds.has(video.id) || savedCoverrIds.has(video.id)) return
    setSavingIds(prev => new Set(prev).add(video.id))
    try {
      const saved = await saveCoverrAsset({
        coverrId: video.id,
        title: video.title,
        url: video.urls.mp4,
        thumbnailUrl: video.poster || video.thumbnail,
        width: video.max_width,
        height: video.max_height,
        duration: video.duration,
        isVertical: video.is_vertical,
      })
      onSaveAsset(saved)
      setLocalSavedIds(prev => new Set(prev).add(video.id))
    } catch {
      // silently fail — user can retry
    } finally {
      setSavingIds(prev => { const s = new Set(prev); s.delete(video.id); return s })
    }
  }

  const hasMore = page + 1 < totalPages

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
            placeholder="Search free stock videos…"
            className="w-full pl-7 pr-3 py-1.5 rounded-lg text-[11px] outline-none transition-colors"
            style={{ background: 'var(--tint-1)', border: '1px solid var(--line-2)', color: 'var(--fg-1)' }}
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">

        {/* Pre-search state */}
        {!query.trim() && (
          <div className="py-10 text-center">
            <Search size={22} className="mx-auto mb-3 opacity-15" style={{ color: 'var(--fg-2)' }} />
            <p className="text-[11px] font-mono" style={{ color: 'var(--fg-4)' }}>
              Search for free stock videos
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
                  <div className="h-2 rounded w-3/4" style={{ background: 'var(--tint-3)' }} />
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
            {results.map(video => (
              <CoverrResultCard
                key={video.id}
                video={video}
                isSaving={savingIds.has(video.id)}
                isSaved={localSavedIds.has(video.id) || savedCoverrIds.has(video.id)}
                onSave={() => handleSave(video)}
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

      {/* Attribution footer */}
      <div
        className="flex items-center justify-center gap-1.5 px-3 py-2 border-t shrink-0"
        style={{ borderColor: 'var(--line-1)' }}
      >
        <a
          href="https://coverr.co"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[9px] font-mono transition-colors hover:opacity-80"
          style={{ color: 'var(--fg-4)' }}
        >
          Videos provided by Coverr
          <ExternalLink size={8} />
        </a>
      </div>
    </div>
  )
}
