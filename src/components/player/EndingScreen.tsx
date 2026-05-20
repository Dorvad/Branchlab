'use client'

import { motion } from 'framer-motion'
import { RotateCcw, Share2 } from 'lucide-react'
import { ScoreSummary } from './ScoreSummary'
import { getNodeById } from '@/lib/scenario-engine'
import type { ScenarioNode, PlayerSessionState, ScenarioLike } from '@/types'

interface EndingScreenProps {
  endingNode: ScenarioNode
  session: PlayerSessionState
  scenario: ScenarioLike
  onRestart: () => void
  mode: 'play' | 'preview'
}

const ENDING_ACCENT: Record<string, { color: string; label: string }> = {
  'node-ending-connected': { color: 'oklch(82% 0.18 165)', label: 'Best outcome' },
  'node-ending-lingering': { color: 'oklch(78% 0.18 285)', label: 'Close' },
  'node-ending-missed':    { color: 'oklch(70% 0.18 25)',  label: 'Missed' },
}

function getAccent(nodeId: string) {
  return ENDING_ACCENT[nodeId] ?? { color: 'oklch(80% 0.16 60)', label: 'Ending' }
}

export function EndingScreen({ endingNode, session, scenario, onRestart, mode }: EndingScreenProps) {
  const accent = getAccent(endingNode.id)
  const hasScore = Object.keys(session.score).length > 0

  // Compute path: exclude the ending node itself from the trail, keep scene nodes
  const pathNodes = session.history
    .slice(0, -1) // remove ending
    .map(id => getNodeById(scenario, id))
    .filter((n): n is NonNullable<typeof n> => n != null)

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      alert('Link copied to clipboard!')
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="absolute inset-0 z-40 overflow-y-auto"
      style={{ background: '#08090d' }}
    >
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(600px 500px at 50% 20%, ${accent.color}0D 0%, transparent 65%)`,
        }}
      />

      <div className="relative min-h-full flex flex-col px-5 py-10 max-w-sm mx-auto">
        {/* Ending badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex justify-center mb-8"
        >
          <span
            className="text-[10px] font-mono tracking-[0.22em] uppercase px-4 py-2 rounded-full"
            style={{
              color: accent.color,
              background: `${accent.color}14`,
              border: `1px solid ${accent.color}35`,
            }}
          >
            {accent.label} · Ending reached
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center font-semibold leading-tight mb-4"
          style={{
            fontSize: 'clamp(32px, 8vw, 48px)',
            letterSpacing: '-0.025em',
            color: '#f5f6fa',
          }}
        >
          {endingNode.title}
        </motion.h1>

        {/* Description */}
        {endingNode.description && (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.4 }}
            className="text-center text-ink-2 leading-relaxed text-[15px] mb-10"
          >
            {endingNode.description}
          </motion.p>
        )}

        {/* Divider */}
        <div className="h-px mb-8" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Path taken */}
        {pathNodes.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mb-8"
          >
            <p className="text-[10px] font-mono text-ink-3 tracking-[0.18em] uppercase mb-3">
              Your path
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {pathNodes.map((node, i) => (
                <span key={node.id} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <span className="text-ink-4 text-xs">→</span>
                  )}
                  <span
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.09)',
                      color: '#c9cdda',
                    }}
                  >
                    {node.title}
                  </span>
                </span>
              ))}
            </div>
          </motion.section>
        )}

        {/* Score summary */}
        {hasScore && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.38, duration: 0.4 }}
            className="mb-10"
          >
            <p className="text-[10px] font-mono text-ink-3 tracking-[0.18em] uppercase mb-4">
              Score
            </p>
            <ScoreSummary score={session.score} />
          </motion.section>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="flex items-center gap-3 mt-auto"
        >
          <button
            onClick={onRestart}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-medium border transition-all hover:bg-white/5 active:scale-[0.98]"
            style={{ borderColor: 'rgba(255,255,255,0.14)', color: '#c9cdda' }}
          >
            <RotateCcw size={14} />
            Play again
          </button>

          {mode === 'play' && (
            <button
              onClick={handleShare}
              className="flex items-center gap-2 py-3.5 px-5 rounded-2xl text-sm font-medium border transition-all hover:bg-white/5 active:scale-[0.98]"
              style={{ borderColor: 'rgba(255,255,255,0.14)', color: '#8a90a4' }}
            >
              <Share2 size={14} />
              Share
            </button>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
