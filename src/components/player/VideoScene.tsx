'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import type { ScenarioNode } from '@/types'

interface VideoSceneProps {
  node: ScenarioNode
  /** Called when the scene ends. Passes a JPEG data URL of the last frame when a real video played. */
  onComplete: (frozenFrame?: string) => void
  /** Seconds before auto-advancing in placeholder mode. 0 = no auto-advance. */
  autoAdvanceSeconds?: number
}

function captureVideoFrame(video: HTMLVideoElement): string | undefined {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx || !canvas.width || !canvas.height) return undefined
    ctx.drawImage(video, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.85)
  } catch {
    return undefined
  }
}

const TYPE_COLOR: Record<string, string> = {
  start: 'oklch(82% 0.18 165)',
  scene: '#8a90a4',
  feedback: 'oklch(78% 0.18 285)',
  ending: 'oklch(80% 0.16 60)',
}

const TYPE_LABEL: Record<string, string> = {
  start: 'Opening scene',
  scene: 'Scene',
  feedback: 'Feedback',
  ending: 'Ending',
}

export function VideoScene({ node, onComplete, autoAdvanceSeconds = 5 }: VideoSceneProps) {
  const color = TYPE_COLOR[node.type] ?? '#8a90a4'
  const clip = node.clip ?? null

  const [done, setDone] = useState(false)

  // ── VIDEO MODE ─────────────────────────────────────────────────────────────

  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoProgress, setVideoProgress] = useState(0)
  const [showFallback, setShowFallback] = useState(false)
  const [needsInteraction, setNeedsInteraction] = useState(false)

  // Reset video state when node changes and explicitly trigger playback.
  // autoPlay alone can be blocked (e.g. new tab); we call play() imperatively
  // so we can detect the block and show a tap-to-play overlay.
  useEffect(() => {
    setDone(false)
    setVideoProgress(0)
    setShowFallback(false)
    setNeedsInteraction(false)

    const v = videoRef.current
    if (!v || !clip) return
    v.load()
    const p = v.play()
    if (p) p.catch(err => {
      if (err.name === 'NotAllowedError') setNeedsInteraction(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id])

  // Show manual "Show choices" button after 1.5s — user shouldn't be trapped
  useEffect(() => {
    if (!clip) return
    const t = setTimeout(() => setShowFallback(true), 1500)
    return () => clearTimeout(t)
  }, [clip, node.id])

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v || !v.duration || !isFinite(v.duration)) return
    setVideoProgress(v.currentTime / v.duration)
  }, [])

  const handleVideoEnded = useCallback(() => {
    if (done) return
    setDone(true)
    onComplete(videoRef.current ? captureVideoFrame(videoRef.current) : undefined)
  }, [done, onComplete])

  const handleVideoSkip = useCallback(() => {
    if (done) return
    setDone(true)
    const frame = videoRef.current ? captureVideoFrame(videoRef.current) : undefined
    if (videoRef.current) videoRef.current.pause()
    onComplete(frame)
  }, [done, onComplete])

  if (clip) {
    return (
      <div className="relative w-full h-full overflow-hidden bg-black select-none">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          src={clip.url}
          autoPlay
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnded}
        />

        {/* Tap-to-play overlay — shown when browser blocks autoplay */}
        {needsInteraction && (
          <button
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            onClick={() => {
              videoRef.current?.play().catch(() => {})
              setNeedsInteraction(false)
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
            >
              <ChevronRight size={28} style={{ color: 'white', marginLeft: 4 }} />
            </div>
            <span className="text-white/80 text-sm font-medium">Tap to play</span>
          </button>
        )}

        {/* Top gradient + status */}
        <div
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 pt-4 pb-12 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: done ? color : 'white',
                opacity: done ? 1 : 0.75,
                boxShadow: done ? `0 0 6px ${color}` : undefined,
              }}
            />
            <span className="text-[10px] font-mono tracking-widest uppercase text-white/70">
              {done ? TYPE_LABEL[node.type] : 'Playing'}
            </span>
          </div>
          {clip.duration > 0 && !done && (
            <span className="text-[10px] font-mono text-white/50 tabular-nums">
              {formatTime(clip.duration * (1 - videoProgress))}
            </span>
          )}
        </div>

        {/* Bottom gradient + title + controls */}
        <div
          className="absolute bottom-0 left-0 right-0 z-10 px-5 pt-20 pb-5"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)' }}
        >
          <motion.div
            key={node.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2
              className="font-semibold text-white leading-tight mb-2"
              style={{ fontSize: 'clamp(18px, 5vw, 28px)', letterSpacing: '-0.02em' }}
            >
              {node.title}
            </h2>
            {node.description && (
              <p className="text-white/60 text-sm leading-relaxed mb-4 max-w-xs">
                {node.description}
              </p>
            )}
          </motion.div>

          {/* Progress bar */}
          <div
            className="relative h-0.5 rounded-full mb-4 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ width: `${videoProgress * 100}%`, background: 'rgba(255,255,255,0.7)', transition: 'width 0.1s linear' }}
            />
          </div>

          {/* Manual "Show choices" fallback */}
          <div className="flex justify-end">
            <AnimatePresence>
              {showFallback && !done && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={handleVideoSkip}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    borderColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                  }}
                >
                  Show choices
                  <ChevronRight size={14} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    )
  }

  // ── PLACEHOLDER MODE (no clip attached) ────────────────────────────────────

  const duration = autoAdvanceSeconds > 0 ? autoAdvanceSeconds * 1000 : null
  return <PlaceholderScene node={node} color={color} duration={duration} onComplete={onComplete} />
}

// ── PlaceholderScene ──────────────────────────────────────────────────────────
// Extracted so VideoScene's hook order is stable regardless of clip presence.

interface PlaceholderSceneProps {
  node: ScenarioNode
  color: string
  duration: number | null
  onComplete: () => void
}

function PlaceholderScene({ node, color, duration, onComplete }: PlaceholderSceneProps) {
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  const finish = useCallback(() => {
    if (done) return
    setDone(true)
    setElapsed(duration ?? 0)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    onComplete()
  }, [done, duration, onComplete])

  useEffect(() => {
    setElapsed(0)
    setDone(false)
    startRef.current = null

    if (!duration) return

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now
      const e = now - startRef.current
      setElapsed(e)
      if (e >= duration) {
        setDone(true)
        onComplete()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id])

  const progress = duration ? Math.min(elapsed / duration, 1) : 0
  const autoAdvanceSeconds = duration ? duration / 1000 : 0
  const clipDuration = node.clip?.duration ?? autoAdvanceSeconds
  const displayTime = formatTime(clipDuration * (1 - progress))

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden select-none">
      {/* Atmospheric background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(70% 60% at 50% 35%, ${color}12 0%, transparent 70%),
            linear-gradient(180deg, #08090d 0%, #0a0b10 100%)
          `,
        }}
      />

      {/* Subtle scanline texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* Status bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          />
          <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color }}>
            {done ? TYPE_LABEL[node.type] : 'Playing'}
          </span>
        </div>
        {clipDuration > 0 && (
          <span className="text-[10px] font-mono text-ink-4 tabular-nums">
            {done ? '0:00' : displayTime}
          </span>
        )}
      </div>

      {/* Main content */}
      <motion.div
        key={node.id}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-4"
      >
        <div className="mb-5">
          <span
            className="text-[10px] font-mono tracking-[0.18em] uppercase px-3 py-1.5 rounded-full"
            style={{ color, background: `${color}14`, border: `1px solid ${color}35` }}
          >
            {TYPE_LABEL[node.type]}
          </span>
        </div>

        <h2
          className="text-center font-semibold leading-tight mb-4 max-w-sm"
          style={{ fontSize: 'clamp(26px, 6vw, 40px)', letterSpacing: '-0.025em', color: '#f5f6fa' }}
        >
          {node.title}
        </h2>

        {node.description && (
          <p className="text-center text-ink-2 leading-relaxed max-w-xs text-[15px]">
            {node.description}
          </p>
        )}
      </motion.div>

      {/* Bottom controls */}
      <div className="relative z-10 shrink-0 px-5 pb-5 pt-3">
        <div
          className="relative h-0.5 rounded-full mb-3 overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <motion.div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{ background: color }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.08, ease: 'linear' }}
          />
        </div>

        <div className="flex justify-end">
          <AnimatePresence>
            {!done && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                onClick={finish}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all hover:brightness-110 active:scale-95"
                style={{ background: `${color}14`, borderColor: `${color}35`, color }}
              >
                Finish clip
                <ChevronRight size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}:${String(rem).padStart(2, '0')}`
}
