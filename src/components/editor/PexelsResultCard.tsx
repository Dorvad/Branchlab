'use client'

import { useState } from 'react'
import { Download, Check, Loader2, Play } from 'lucide-react'
import type { PexelsPhoto, PexelsVideo } from '@/lib/pexels/types'

interface PexelsResultCardProps {
  item: PexelsPhoto | PexelsVideo
  type: 'video' | 'photo'
  isSaving: boolean
  isSaved: boolean
  onSave: () => void
}

export function PexelsResultCard({ item, type, isSaving, isSaved, onSave }: PexelsResultCardProps) {
  const [hovered, setHovered] = useState(false)

  const thumbnailUrl = type === 'video'
    ? (item as PexelsVideo).image
    : (item as PexelsPhoto).src.small

  const duration = type === 'video' ? (item as PexelsVideo).duration : undefined
  const photographer = type === 'video' ? (item as PexelsVideo).user.name : (item as PexelsPhoto).photographer
  const pexelsUrl = item.url

  const formatDur = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden group cursor-pointer"
      style={{ background: 'var(--tint-1)', border: '1px solid var(--line-1)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden" style={{ background: 'var(--bg-1)' }}>
        <img
          src={thumbnailUrl}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Duration badge for videos */}
        {type === 'video' && duration != null && (
          <div
            className="absolute bottom-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono text-[9px]"
            style={{ background: 'rgba(0,0,0,0.75)', color: '#fff' }}
          >
            <Play size={7} />
            {formatDur(duration)}
          </div>
        )}

        {/* Type badge */}
        <div
          className="absolute top-1 left-1 px-1.5 py-0.5 rounded font-mono text-[8px] tracking-wider uppercase"
          style={{
            background: type === 'video' ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.65)',
            color: type === 'video' ? 'oklch(82% 0.18 165)' : 'oklch(80% 0.12 240)',
            border: `1px solid ${type === 'video' ? 'oklch(82% 0.18 165 / 0.3)' : 'oklch(80% 0.12 240 / 0.3)'}`,
          }}
        >
          {type}
        </div>

        {/* Hover overlay with download button */}
        {hovered && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.45)' }}
          >
            <button
              onClick={e => { e.stopPropagation(); if (!isSaving && !isSaved) onSave() }}
              className="flex items-center justify-center w-9 h-9 rounded-full transition-all hover:scale-110"
              style={{
                background: isSaved ? 'oklch(82% 0.18 165)' : 'rgba(255,255,255,0.95)',
                color: isSaved ? '#052916' : '#111',
              }}
              title={isSaved ? 'Already in library' : 'Save to library'}
            >
              {isSaving
                ? <Loader2 size={15} className="animate-spin" />
                : isSaved
                ? <Check size={15} />
                : <Download size={15} />}
            </button>
          </div>
        )}

        {/* Already-saved indicator (always visible when saved, not hovering) */}
        {isSaved && !hovered && (
          <div
            className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 rounded-full"
            style={{ background: 'oklch(82% 0.18 165)', color: '#052916' }}
          >
            <Check size={9} />
          </div>
        )}
      </div>

      {/* Photographer credit */}
      <div className="px-2 py-1.5">
        <a
          href={pexelsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-[9px] font-mono truncate block hover:underline"
          style={{ color: 'var(--fg-4)' }}
          title={`Photo by ${photographer} on Pexels`}
        >
          {photographer}
        </a>
      </div>
    </div>
  )
}
