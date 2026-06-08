'use client'

// Lightweight, host/participant-controlled media preview for a scenario node —
// deliberately NOT the full VideoScene/YouTubeScene player components, which
// are built around auto-advancing playback + progress tracking for the public
// player. Facilitator Mode pacing is controlled entirely by the host, so this
// just renders whatever the node carries (clip, YouTube embed, or thumbnail).

import type { ScenarioNode } from '@/types'

interface SceneMediaProps {
  node: ScenarioNode | null
  className?: string
  /** Aspect ratio box — defaults to 16:9 (host/projector). Pass "9/16" for mobile portrait. */
  aspectRatio?: string
}

export function SceneMedia({ node, className, aspectRatio = '16/9' }: SceneMediaProps) {
  if (!node) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl ${className ?? ''}`}
        style={{ aspectRatio, background: 'var(--bg-2)', border: '1px solid var(--line-2)' }}
      >
        <p className="text-xs font-mono" style={{ color: 'var(--fg-4)' }}>No scene loaded</p>
      </div>
    )
  }

  const clip = node.clip
  const youtube = node.youtubeAsset
  const thumbnail = node.thumbnailUrl

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className ?? ''}`}
      style={{ aspectRatio, background: '#000', border: '1px solid var(--line-2)' }}
    >
      {clip ? (
        <video
          key={clip.id}
          src={clip.url}
          poster={clip.thumbnail}
          controls
          playsInline
          className="absolute inset-0 w-full h-full object-contain"
        />
      ) : youtube ? (
        <iframe
          key={youtube.id}
          src={buildYouTubeEmbedUrl(youtube.youtubeVideoId, node.youtubeStartTime, node.youtubeEndTime)}
          title={node.title}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnail} alt={node.title} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>No media on this scene</p>
        </div>
      )}

      <div
        className="absolute bottom-0 left-0 right-0 px-4 py-3"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}
      >
        <p className="text-sm font-medium text-white truncate">{node.title}</p>
      </div>
    </div>
  )
}

function buildYouTubeEmbedUrl(videoId: string, start?: number, end?: number | null): string {
  const params = new URLSearchParams({ rel: '0', modestbranding: '1' })
  if (start) params.set('start', String(Math.floor(start)))
  if (end != null) params.set('end', String(Math.floor(end)))
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}
