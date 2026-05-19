'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, RotateCcw, Share2 } from 'lucide-react'
import Link from 'next/link'
import { VideoScene } from './VideoScene'
import { ChoiceButton } from './ChoiceButton'
import { createSession, advanceSession, getNodeById } from '@/lib/scenario-engine'
import type { Scenario, ScenarioVersion, PlayerSessionState } from '@/types'

type ScenarioLike = Scenario | ScenarioVersion

interface ScenarioPlayerProps {
  scenario: ScenarioLike
  mode?: 'play' | 'preview'
  backHref?: string
}

export function ScenarioPlayer({ scenario, mode = 'play', backHref }: ScenarioPlayerProps) {
  const [session, setSession] = useState<PlayerSessionState>(() => createSession(scenario))
  const [showChoices, setShowChoices] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  const currentNode = getNodeById(scenario, session.currentNodeId)
  const isEnding = currentNode?.type === 'ending'
  const stepNumber = session.history.length
  const totalNodes = scenario.nodes.filter(n => n.type !== 'ending').length

  const handleSceneComplete = useCallback(() => {
    if (isEnding) return
    setShowChoices(true)
  }, [isEnding])

  const handleChoice = useCallback((choiceId: string) => {
    setTransitioning(true)
    setShowChoices(false)
    setTimeout(() => {
      setSession(prev => advanceSession(prev, scenario, choiceId))
      setTransitioning(false)
    }, 300)
  }, [scenario])

  const handleRestart = useCallback(() => {
    setShowChoices(false)
    setTransitioning(false)
    setSession(createSession(scenario))
  }, [scenario])

  if (!currentNode) return null

  return (
    <div className="fixed inset-0 bg-bg-0 flex flex-col overflow-hidden">
      {/* Background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(800px 600px at 50% 30%, rgba(255,255,255,0.02) 0%, transparent 70%)',
        }}
      />

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-4 shrink-0 z-10"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink-1 transition-colors"
            >
              <ArrowLeft size={14} />
            </Link>
          )}
          <div>
            <p className="text-xs font-mono text-ink-3 tracking-widest uppercase line-clamp-1">
              {mode === 'preview' ? '⚠ Preview Mode' : 'Now playing'}
            </p>
            <p className="text-sm text-ink-1 font-medium leading-tight truncate max-w-[200px]">
              {'title' in scenario ? (scenario as Scenario).title : 'Scenario'}
            </p>
          </div>
        </div>

        {/* Progress dots */}
        {!isEnding && (
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.min(totalNodes, 8) }).map((_, i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-all"
                style={{
                  background: i < stepNumber ? 'var(--neon-mint)' : 'rgba(255,255,255,0.12)',
                  boxShadow: i === stepNumber - 1 ? 'var(--glow-mint)' : undefined,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <AnimatePresence mode="wait">
          {!transitioning && (
            <motion.div
              key={session.currentNodeId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col"
            >
              {/* Video area */}
              <div className="flex-1 relative">
                <VideoScene
                  node={currentNode}
                  onComplete={handleSceneComplete}
                  autoPlay={!isEnding}
                />
              </div>

              {/* Ending screen */}
              {isEnding && (
                <EndingPanel
                  node={currentNode}
                  session={session}
                  scenario={scenario}
                  onRestart={handleRestart}
                  mode={mode}
                />
              )}

              {/* Choices overlay */}
              {showChoices && !isEnding && currentNode.choices.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="px-5 pb-8 pt-4 space-y-3 shrink-0"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-xs font-mono text-ink-3 tracking-widest uppercase mb-3">
                    What do you do?
                  </p>
                  {currentNode.choices.map((choice, i) => (
                    <ChoiceButton key={choice.id} choice={choice} index={i} onSelect={handleChoice} />
                  ))}
                </motion.div>
              )}

              {/* Dead end (no choices, not ending) */}
              {showChoices && !isEnding && currentNode.choices.length === 0 && (
                <div className="px-5 pb-8 pt-4 text-center">
                  <p className="text-sm text-ink-3 font-mono">— scene has no choices yet —</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function EndingPanel({
  node,
  session,
  scenario,
  onRestart,
  mode,
}: {
  node: ReturnType<typeof getNodeById>
  session: PlayerSessionState
  scenario: ScenarioLike
  onRestart: () => void
  mode: 'play' | 'preview'
}) {
  const historyTitles = session.history.map(id => {
    const n = getNodeById(scenario, id)
    return n?.title ?? id
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className="px-5 pb-8 pt-4 shrink-0"
      style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Path taken */}
      <div className="mb-5">
        <p className="text-xs font-mono text-ink-3 tracking-widest uppercase mb-3">Your path</p>
        <div className="flex flex-wrap gap-2">
          {historyTitles.map((title, i) => (
            <span key={i} className="flex items-center gap-1.5 text-xs text-ink-2">
              {i > 0 && <span className="text-ink-4">→</span>}
              <span
                className="px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {title}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onRestart}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-sm font-medium border transition-all hover:bg-white/5"
          style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#c9cdda' }}
        >
          <RotateCcw size={14} />
          Play again
        </button>
        {mode === 'play' && (
          <button
            className="flex items-center gap-2 py-3 px-4 rounded-2xl text-sm font-medium border transition-all hover:bg-white/5"
            style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#8a90a4' }}
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href)
              alert('Link copied!')
            }}
          >
            <Share2 size={14} />
            Share
          </button>
        )}
      </div>
    </motion.div>
  )
}
