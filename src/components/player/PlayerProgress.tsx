'use client'

import { motion } from 'framer-motion'

interface PlayerProgressProps {
  step: number   // 1-indexed, number of nodes visited so far
  max?: number   // cap on visible dots
}

export function PlayerProgress({ step, max = 8 }: PlayerProgressProps) {
  const dots = Math.max(step, 1)
  const visible = Math.min(dots, max)

  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${step}`}>
      {Array.from({ length: visible }).map((_, i) => {
        const isCurrent = i === visible - 1
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: isCurrent ? 1 : 0.35, scale: 1 }}
            transition={{ delay: i * 0.04, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-full transition-all duration-500"
            style={{
              width: isCurrent ? 18 : 6,
              height: 6,
              background: 'var(--neon-mint)',
              boxShadow: isCurrent ? 'var(--glow-mint)' : undefined,
            }}
          />
        )
      })}
    </div>
  )
}
