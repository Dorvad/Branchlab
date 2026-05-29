'use client'

import { useState } from 'react'
import { Download, Check, Loader2, Play } from 'lucide-react'
import type { CoverrVideoHit } from '@/lib/coverr/types'

interface CoverrResultCardProps {
  video: CoverrVideoHit
  isSaving: boolean
  isSaved: boolean
  onSave: () => void
}

export function CoverrResultCard({ video, isSaving, isSaved, onSave }: CoverrResultCardProps) {
  const [hovered, setHovered] = useState(false)

  const formatDur = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.round(s % 60)
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
          src={video.poster || video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Duration badge */}
        <div
          className="absolute bottom-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono text-[9px]"
          style={{ background: 'rgba(0,0,0,0.75)', color: '#fff' }}
        >
          <Play size={7} />
          {formatDur(video.duration)}
        </div>

        {/* Orientation badge */}
        {video.is_vertical && (
          <div
            className="absolute top-1 left-1 px-1.5 py-0.5 rounded font-mono text-[8px] tracking-wider"
            style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--fg-2)', border: '1px solid var(--line-2)' }}
          >
            Portrait
          </div>
        )}

        {/* Hover overlay */}
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

        {/* Always-visible saved indicator */}
        {isSaved && !hovered && (
          <div
            className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 rounded-full"
            style={{ background: 'oklch(82% 0.18 165)', color: '#052916' }}
          >
            <Check size={9} />
          </div>
        )}
      </div>

      {/* Title */}
      <div className="px-2 py-1.5">
        <p
          className="text-[9px] font-mono truncate"
          style={{ color: 'var(--fg-3)' }}
          title={video.title}
        >
          {video.title}
        </p>
      </div>
    </div>
  )
}
