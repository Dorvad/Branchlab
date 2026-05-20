'use client'

import { motion } from 'framer-motion'

interface ScoreSummaryProps {
  score: Record<string, number>
}

const SCORE_META: Record<string, { label: string; color: string; max: number }> = {
  confidence: { label: 'Confidence', color: 'oklch(82% 0.18 165)', max: 20 },
  connection: { label: 'Connection', color: 'oklch(78% 0.18 285)', max: 20 },
  empathy:    { label: 'Empathy',    color: 'oklch(78% 0.18 285)', max: 20 },
  directness: { label: 'Directness', color: 'oklch(80% 0.16 60)',  max: 20 },
  initiative: { label: 'Initiative', color: 'oklch(82% 0.18 165)', max: 20 },
  composure:  { label: 'Composure',  color: 'oklch(80% 0.16 60)',  max: 20 },
}

export function ScoreSummary({ score }: ScoreSummaryProps) {
  const entries = Object.entries(score).filter(([, v]) => v !== 0)
  if (entries.length === 0) return null

  return (
    <div className="space-y-3">
      {entries.map(([key, value], i) => {
        const meta = SCORE_META[key] ?? { label: key, color: 'var(--neon-mint)', max: 20 }
        const isNegative = value < 0
        const pct = Math.max(0, Math.min(Math.abs(value) / meta.max, 1)) * 100
        const color = isNegative ? 'var(--neon-danger)' : meta.color

        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono text-ink-2 tracking-wider uppercase">
                {meta.label}
              </span>
              <span
                className="text-xs font-mono font-medium tabular-nums"
                style={{ color }}
              >
                {isNegative ? '' : '+'}{value}
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.07)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: color }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: i * 0.08 + 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
