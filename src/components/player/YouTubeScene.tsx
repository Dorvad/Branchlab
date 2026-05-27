'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Youtube, AlertTriangle } from 'lucide-react'
import type { ScenarioNode } from '@/types'
import { loadYouTubeIframeAPI } from '@/lib/youtube'

interface YouTubeSceneProps {
  node: ScenarioNode
  onComplete: () => void
}

const TYPE_COLOR: Record<string, string> = {
  start: 'oklch(82% 0.18 165)',
  scene: '#8a90a4',
  feedback: 'oklch(78% 0.18 285)',
  ending: 'oklch(80% 0.16 60)',
}

function useIsPortraitMobile() {
  const [is, setIs] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 768px) and (orientation: portrait)').matches
      : false
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px) and (orientation: portrait)')
    setIs(mq.matches)
    const h = () => setIs(mq.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return is
}

export function YouTubeScene({ node, onComplete }: YouTubeSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YT.Player | null>(null)
  const doneRef = useRef(false)
  const intervalRef = useRef<number | null>(null)
  const color = TYPE_COLOR[node.type] ?? '#8a90a4'
  const isPortraitMobile = useIsPortraitMobile()

  const youtubeAsset = node.youtubeAsset!
  const startSeconds = node.youtubeStartTime ?? 0
  const endSeconds = node.youtubeEndTime ?? null

  const [done, setDone] = useState(false)
  const [showFallback, setShowFallback] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [playerError, setPlayerError] = useState(false)
  const [apiError, setApiError] = useState(false)

  const triggerComplete = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    setDone(true)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    onComplete()
  }, [onComplete])

  // ── Setup player ────────────────────────────────────────────────────────────

  useEffect(() => {
    doneRef.current = false
    setDone(false)
    setShowFallback(false)
    setPlayerReady(false)
    setPlayerError(false)
    setApiError(false)

    let destroyed = false

    loadYouTubeIframeAPI()
      .then(() => {
        if (destroyed || !containerRef.current) return

        playerRef.current = new YT.Player(containerRef.current, {
          videoId: youtubeAsset.youtubeVideoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1 as 1,
            controls: 0 as 0,
            playsinline: 1 as 1,
            rel: 0 as 0,
            enablejsapi: 1 as 1,
            origin: window.location.origin,
            start: Math.floor(startSeconds),
            ...(endSeconds != null ? { end: Math.ceil(endSeconds) } : {}),
          },
          events: {
            onReady: () => {
              if (destroyed) return
              setPlayerReady(true)
              // Seek precisely (playerVars.start only works to integer seconds)
              if (startSeconds > 0) {
                playerRef.current?.seekTo(startSeconds, true)
              }
            },
            onStateChange: (e) => {
              if (destroyed) return
              if (e.data === YT.PlayerState.ENDED) {
                triggerComplete()
              }
            },
            onError: () => {
              if (!destroyed) setPlayerError(true)
            },
          },
        })

        // Poll for endSeconds (100ms interval; YT endSeconds param is imprecise)
        if (endSeconds !== null) {
          intervalRef.current = window.setInterval(() => {
            const p = playerRef.current
            if (!p?.getCurrentTime) return
            const t = p.getCurrentTime()
            if (t >= endSeconds) {
              p.pauseVideo()
              triggerComplete()
            }
          }, 100)
        }
      })
      .catch(() => {
        if (!destroyed) setApiError(true)
      })

    return () => {
      destroyed = true
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      try { playerRef.current?.destroy() } catch {}
      playerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id])

  // Show skip button after 3 seconds
  useEffect(() => {
    const t = setTimeout(() => setShowFallback(true), 3000)
    return () => clearTimeout(t)
  }, [node.id])

  // ── Error state ─────────────────────────────────────────────────────────────

  if (apiError || playerError) {
    return (
      <div
        className="relative w-full h-full flex flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ background: '#08090d' }}
      >
        <AlertTriangle size={28} style={{ color: 'oklch(80% 0.16 60)' }} />
        <div>
          <p className="text-base font-medium mb-1" style={{ color: 'var(--fg-1)' }}>
            This YouTube video can&apos;t be played here.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-4)' }}>
            It may be private, unavailable, or embedding is disabled by the video owner.
          </p>
        </div>
        <button
          onClick={triggerComplete}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium border transition-all hover:brightness-110"
          style={{
            background: `${color}18`,
            borderColor: `${color}40`,
            color,
          }}
        >
          Show choices
          <ChevronRight size={14} />
        </button>
      </div>
    )
  }

  // YouTube videos are always landscape (16:9) — rotate to fill portrait screen
  const wrapStyle: React.CSSProperties = isPortraitMobile
    ? { position: 'absolute', width: '100vh', height: '100vw', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(90deg)' }
    : { position: 'absolute', inset: 0 }

  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none">
      {/* YouTube iframe mounts here — rotated to landscape on portrait mobile */}
      <div style={wrapStyle}>
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* Loading overlay */}
      {!playerReady && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 pointer-events-none"
          style={{ background: '#08090d' }}
        >
          <Youtube size={36} style={{ color: '#ff0000', opacity: 0.8 }} />
          <p className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading video…</p>
        </div>
      )}

      {/* Top status bar */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 pt-4 pb-12 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: done ? color : 'white', opacity: done ? 1 : 0.75 }}
          />
          <span className="text-[10px] font-mono tracking-widest uppercase text-white/70">
            {done ? 'Done' : 'Playing'}
          </span>
        </div>
        <span
          className="flex items-center gap-1 text-[9px] font-mono"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          <Youtube size={9} style={{ color: '#ff0000', opacity: 0.7 }} />
          YouTube
        </span>
      </div>

      {/* Skip button */}
      <AnimatePresence>
        {showFallback && !done && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={triggerComplete}
            className="absolute bottom-5 right-5 z-10 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all hover:brightness-110 active:scale-95"
            style={{
              background: 'rgba(0,0,0,0.45)',
              borderColor: 'rgba(255,255,255,0.18)',
              color: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(8px)',
            }}
          >
            Skip
            <ChevronRight size={14} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
