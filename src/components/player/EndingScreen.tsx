'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, Share2, Flag } from 'lucide-react'
import { ScoreSummary } from './ScoreSummary'
import { getNodeById } from '@/lib/scenario-engine'
import type { ScenarioNode, PlayerSessionState, ScenarioLike } from '@/types'

interface EndingScreenProps {
  endingNode: ScenarioNode
  session: PlayerSessionState
  scenario: ScenarioLike
  onRestart: () => void
  onRestartFromCheckpoint: () => void
  mode: 'play' | 'preview'
}

export function EndingScreen({ endingNode, session, scenario, onRestart, onRestartFromCheckpoint, mode }: EndingScreenProps) {
  // Notify SCORM wrapper (or any parent frame) when an ending is reached
  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) return
    const totalScore = Object.values(session.score).reduce((a, b) => a + b, 0)
    window.parent.postMessage({
      type: 'branchlab:ending_reached',
      endingNodeId: endingNode.id,
      endingTitle: endingNode.title,
      score: Object.keys(session.score).length > 0 ? totalScore : undefined,
    }, '*')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const latestCheckpoint = session.latestCheckpoint
  const outcome = endingNode.outcome
  const accentColor = outcome === 'correct'
    ? 'oklch(82% 0.18 165)'
    : outcome === 'incorrect'
    ? 'oklch(70% 0.18 25)'
    : 'oklch(80% 0.16 60)'
  const accentLabel = outcome === 'correct' ? 'Correct' : outcome === 'incorrect' ? 'Incorrect' : 'Ending'
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
          background: `radial-gradient(600px 500px at 50% 20%, ${accentColor}0D 0%, transparent 65%)`,
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
              color: accentColor,
              background: `${accentColor}14`,
              border: `1px solid ${accentColor}35`,
            }}
          >
            {accentLabel} · Ending reached
          </span>
        </motion.div>

        {outcome && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center mb-6"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold"
              style={{
                background: `${accentColor}18`,
                border: `2px solid ${accentColor}55`,
                color: accentColor,
                boxShadow: `0 0 32px ${accentColor}30`,
              }}
            >
              {outcome === 'correct' ? '✓' : '✗'}
            </div>
          </motion.div>
        )}

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
        <div className="h-px mb-8" style={{ background: 'var(--line-1)' }} />

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
                      background: 'var(--tint-2)',
                      border: '1px solid var(--line-2)',
                      color: 'var(--fg-1)',
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
          className="flex flex-col gap-2.5 mt-auto"
        >
          {latestCheckpoint && (
            <button
              onClick={onRestartFromCheckpoint}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-medium border transition-all active:scale-[0.98]"
              style={{
                background: `${accentColor}10`,
                borderColor: `${accentColor}35`,
                color: accentColor,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = `${accentColor}1a`)}
              onMouseLeave={e => (e.currentTarget.style.background = `${accentColor}10`)}
            >
              <Flag size={14} />
              Try again from checkpoint
              <span style={{ opacity: 0.55, fontSize: '0.8em' }}>— {latestCheckpoint.label}</span>
            </button>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={onRestart}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-medium border transition-all hover:bg-[var(--tint-3)] active:scale-[0.98]"
              style={{ borderColor: 'var(--line-3)', color: latestCheckpoint ? 'var(--fg-3)' : 'var(--fg-1)' }}
            >
              <RotateCcw size={14} />
              {latestCheckpoint ? 'Restart from beginning' : 'Play again'}
            </button>

            {mode === 'play' && (
              <button
                onClick={handleShare}
                className="flex items-center gap-2 py-3.5 px-5 rounded-2xl text-sm font-medium border transition-all hover:bg-[var(--tint-3)] active:scale-[0.98]"
                style={{ borderColor: 'var(--line-3)', color: 'var(--fg-2)' }}
              >
                <Share2 size={14} />
                Share
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
