'use client'

import { useState } from 'react'
import { Download, Check, Loader2, Play, Film, Image as ImageIcon } from 'lucide-react'
import { videoThumbnail } from '@/lib/pixabay/client'
import type { PixabayImage, PixabayVideo } from '@/lib/pixabay/types'

interface PixabayResultCardProps {
  item: PixabayImage | PixabayVideo
  type: 'video' | 'image'
  isSaving: boolean
  isSaved: boolean
  onSave: () => void
}

export function PixabayResultCard({ item, type, isSaving, isSaved, onSave }: PixabayResultCardProps) {
  const [hovered, setHovered] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  const thumbnailUrl = type === 'video'
    ? videoThumbnail(item as PixabayVideo)
    : (item as PixabayImage).previewURL

  const duration = type === 'video' ? (item as PixabayVideo).duration : undefined
  const imageType = type === 'image' ? (item as PixabayImage).type : undefined

  const formatDur = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer"
      style={{ background: 'var(--tint-1)', border: '1px solid var(--line-1)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative aspect-video overflow-hidden" style={{ background: 'var(--bg-1)' }}>
        {imgFailed ? (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'var(--tint-2)' }}
          >
            {type === 'video'
              ? <Film size={20} style={{ color: 'var(--fg-4)' }} />
              : <ImageIcon size={20} style={{ color: 'var(--fg-4)' }} />}
          </div>
        ) : (
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        )}

        {/* Duration for videos */}
        {duration != null && (
          <div
            className="absolute bottom-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono text-[9px]"
            style={{ background: 'rgba(0,0,0,0.75)', color: '#fff' }}
          >
            <Play size={7} />
            {formatDur(duration)}
          </div>
        )}

        {/* Image type badge (photo / illustration / vector) */}
        {imageType && imageType !== 'photo' && (
          <div
            className="absolute top-1 left-1 px-1.5 py-0.5 rounded font-mono text-[8px] tracking-wider capitalize"
            style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--fg-2)', border: '1px solid var(--line-2)' }}
          >
            {imageType}
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

      {/* Credit */}
      <div className="px-2 py-1.5">
        <p className="text-[9px] font-mono truncate" style={{ color: 'var(--fg-4)' }}>
          {item.user}
        </p>
      </div>
    </div>
  )
}
