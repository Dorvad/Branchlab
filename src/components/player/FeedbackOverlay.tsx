'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import type { ScoreEffects } from '@/types'

interface FeedbackOverlayProps {
  text: string
  scoreDeltas?: ScoreEffects
  onContinue: () => void
}

const SCORE_COLORS: Record<string, string> = {
  confidence: 'var(--neon-mint)',
  connection: 'oklch(78% 0.18 285)',
  empathy: 'oklch(78% 0.18 285)',
  directness: 'var(--neon-amber)',
  initiative: 'var(--neon-mint)',
  composure: 'var(--neon-amber)',
}

function scoreColor(key: string, value: number): string {
  if (value < 0) return 'var(--neon-danger)'
  return SCORE_COLORS[key] ?? 'var(--neon-mint)'
}

export function FeedbackOverlay({ text, scoreDeltas, onContinue }: FeedbackOverlayProps) {
  const deltas = scoreDeltas
    ? Object.entries(scoreDeltas).filter(([, v]) => v !== 0)
    : []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-30 flex items-center justify-center px-5"
      style={{ background: 'rgba(8,9,13,0.82)', backdropFilter: 'blur(12px)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -8 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        {/* Feedback card */}
        <div
          className="rounded-2xl p-6 mb-5"
          style={{
            background: 'rgba(20,24,34,0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          }}
        >
          {/* Quote mark */}
          <p
            className="text-[36px] leading-none font-serif mb-3 select-none"
            style={{ color: 'rgba(255,255,255,0.12)' }}
          >
            "
          </p>

          {/* Feedback text */}
          <p
            className="text-lg leading-relaxed font-medium"
            style={{ color: '#e8eaf0', letterSpacing: '-0.01em' }}
          >
            {text}
          </p>

          {/* Score deltas */}
          {deltas.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              {deltas.map(([key, value]) => (
                <span
                  key={key}
                  className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full"
                  style={{
                    color: scoreColor(key, value),
                    background: `${scoreColor(key, value)}14`,
                    border: `1px solid ${scoreColor(key, value)}30`,
                  }}
                >
                  {value > 0 ? '+' : ''}{value} {key}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Continue button */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={onContinue}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-medium transition-all hover:brightness-110 active:scale-[0.98]"
          style={{
            background: 'var(--neon-mint)',
            color: '#052916',
            boxShadow: 'var(--glow-mint)',
          }}
        >
          Continue
          <ArrowRight size={15} />
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
