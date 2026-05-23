'use client'

import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

interface OpeningInstructionsScreenProps {
  title: string
  body: string
  startButtonText: string
  onStart: () => void
}

export function OpeningInstructionsScreen({
  title,
  body,
  startButtonText,
  onStart,
}: OpeningInstructionsScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: '#08090d' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(60% 50% at 50% 40%, oklch(82% 0.18 165 / 0.06) 0%, transparent 70%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm text-center"
      >
        {/* Eyebrow */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-px w-8" style={{ background: 'oklch(82% 0.18 165 / 0.35)' }} />
          <span
            className="text-[9px] font-mono tracking-[0.22em] uppercase"
            style={{ color: 'oklch(82% 0.18 165 / 0.7)' }}
          >
            Simulation
          </span>
          <div className="h-px w-8" style={{ background: 'oklch(82% 0.18 165 / 0.35)' }} />
        </div>

        {/* Title */}
        <h1
          className="font-semibold leading-tight mb-4"
          style={{
            fontSize: 'clamp(22px, 5.5vw, 32px)',
            letterSpacing: '-0.02em',
            color: '#f5f6fa',
          }}
        >
          {title || 'Before you begin'}
        </h1>

        {/* Body */}
        {body && (
          <p
            className="leading-relaxed mb-8 text-sm"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            {body}
          </p>
        )}

        {/* Start button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
          className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl text-sm font-medium transition-all"
          style={{
            background: 'oklch(82% 0.18 165)',
            color: '#052916',
            boxShadow: '0 0 24px oklch(82% 0.18 165 / 0.35)',
          }}
        >
          {startButtonText || 'Start simulation'}
          <ChevronRight size={15} />
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
