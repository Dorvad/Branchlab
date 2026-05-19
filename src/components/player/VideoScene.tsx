'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import type { ScenarioNode } from '@/types'

interface VideoSceneProps {
  node: ScenarioNode
  onComplete: () => void
  autoPlay?: boolean
}

const PLAY_DURATION = 4000 // ms for mock video

export function VideoScene({ node, onComplete, autoPlay = true }: VideoSceneProps) {
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    setProgress(0)
    setDone(false)
    startRef.current = null

    if (!autoPlay) return

    const tick = () => {
      const now = Date.now()
      if (startRef.current === null) startRef.current = now
      const elapsed = now - startRef.current
      const p = Math.min(elapsed / PLAY_DURATION, 1)
      setProgress(p)
      if (p >= 1) {
        clearInterval(intervalRef.current!)
        setDone(true)
        onComplete()
      }
    }

    intervalRef.current = setInterval(tick, 50)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [node.id, autoPlay, onComplete])

  const skip = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setProgress(1)
    setDone(true)
    onComplete()
  }

  const typeColor = {
    start: 'oklch(82% 0.18 165)',
    scene: '#8a90a4',
    feedback: 'oklch(78% 0.18 285)',
    ending: 'oklch(80% 0.16 60)',
  }[node.type] ?? '#8a90a4'

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden select-none">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(600px 400px at 50% 40%, ${typeColor}0D 0%, transparent 70%)`,
        }}
      />

      {/* Scene card */}
      <motion.div
        key={node.id}
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: -16 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 max-w-md w-full mx-auto px-6"
      >
        {/* Type badge */}
        <div className="flex justify-center mb-6">
          <span
            className="text-[10px] font-mono tracking-widest uppercase px-3 py-1.5 rounded-full"
            style={{
              color: typeColor,
              background: `${typeColor}14`,
              border: `1px solid ${typeColor}35`,
            }}
          >
            {node.type === 'start' ? 'Opening scene' : node.type === 'ending' ? 'Ending' : 'Scene'}
          </span>
        </div>

        {/* Title */}
        <h2
          className="text-center text-3xl font-semibold tracking-[-0.02em] leading-tight mb-4"
          style={{ color: '#f5f6fa' }}
        >
          {node.title}
        </h2>

        {/* Description */}
        {node.description && (
          <p className="text-center text-base text-ink-2 leading-relaxed">{node.description}</p>
        )}

        {/* Skip button */}
        <AnimatePresence>
          {!done && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.6 }}
              className="flex justify-center mt-8"
            >
              <button
                onClick={skip}
                className="flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink-1 transition-colors"
              >
                Skip to choices
                <ChevronRight size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5"
        style={{ background: 'rgba(255,255,255,0.07)' }}
      >
        <motion.div
          className="h-full"
          style={{ background: typeColor, width: `${progress * 100}%` }}
          transition={{ duration: 0.05 }}
        />
      </div>
    </div>
  )
}
