'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import type { ScenarioNode } from '@/types'

interface VideoSceneProps {
  node: ScenarioNode
  onComplete: () => void
  /** Seconds before auto-advancing. 0 = no auto-advance. */
  autoAdvanceSeconds?: number
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
  const duration = autoAdvanceSeconds > 0 ? autoAdvanceSeconds * 1000 : null

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
      <div
        className="relative z-10 flex items-center justify-between px-5 pt-4 pb-2 shrink-0"
      >
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          />
          <span
            className="text-[10px] font-mono tracking-widest uppercase"
            style={{ color }}
          >
            {done ? TYPE_LABEL[node.type] : 'Playing'}
          </span>
        </div>
        {clipDuration > 0 && (
          <span className="text-[10px] font-mono text-ink-4 tabular-nums">
            {done ? '0:00' : displayTime}
          </span>
        )}
      </div>

      {/* Main content — vertically centered */}
      <motion.div
        key={node.id}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-4"
      >
        {/* Type badge */}
        <div className="mb-5">
          <span
            className="text-[10px] font-mono tracking-[0.18em] uppercase px-3 py-1.5 rounded-full"
            style={{
              color,
              background: `${color}14`,
              border: `1px solid ${color}35`,
            }}
          >
            {TYPE_LABEL[node.type]}
          </span>
        </div>

        {/* Title */}
        <h2
          className="text-center font-semibold leading-tight mb-4 max-w-sm"
          style={{
            fontSize: 'clamp(26px, 6vw, 40px)',
            letterSpacing: '-0.025em',
            color: '#f5f6fa',
          }}
        >
          {node.title}
        </h2>

        {/* Description */}
        {node.description && (
          <p className="text-center text-ink-2 leading-relaxed max-w-xs text-[15px]">
            {node.description}
          </p>
        )}
      </motion.div>

      {/* Bottom controls */}
      <div className="relative z-10 shrink-0 px-5 pb-5 pt-3">
        {/* Progress bar */}
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

        {/* Finish clip button */}
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
                style={{
                  background: `${color}14`,
                  borderColor: `${color}35`,
                  color,
                }}
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
