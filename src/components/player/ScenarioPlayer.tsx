'use client'

import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { VideoScene } from './VideoScene'
import { ChoicePanel } from './ChoicePanel'
import { FeedbackOverlay } from './FeedbackOverlay'
import { EndingScreen } from './EndingScreen'
import { PlayerProgress } from './PlayerProgress'

import {
  createSession,
  advanceSession,
  getNodeById,
  getAvailableChoices,
  isEndingNode,
} from '@/lib/scenario-engine'

import type { Scenario, ScenarioVersion, PlayerSessionState, PlayerPhase, ScenarioChoice } from '@/types'

type ScenarioLike = Scenario | ScenarioVersion

interface ScenarioPlayerProps {
  scenario: ScenarioLike
  mode?: 'play' | 'preview'
  backHref?: string
  contained?: boolean // when true: relative positioning instead of fixed inset-0
}

export function ScenarioPlayer({ scenario, mode = 'play', backHref, contained = false }: ScenarioPlayerProps) {
  const [session, setSession] = useState<PlayerSessionState>(() => createSession(scenario))
  const [phase, setPhase] = useState<PlayerPhase>('watching')
  const [pendingChoice, setPendingChoice] = useState<ScenarioChoice | null>(null)
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null)

  const currentNode = getNodeById(scenario, session.currentNodeId)!
  const choices = getAvailableChoices(scenario, session.currentNodeId)

  // The background shown behind choices: custom thumbnail takes priority over captured frame
  const choiceBackground = currentNode.thumbnailUrl ?? frozenFrame ?? null

  // Step count: non-ending nodes visited so far
  const stepCount = session.history.filter(id => !isEndingNode(scenario, id)).length

  const scenarioTitle = 'title' in scenario
    ? (scenario as Scenario).title
    : 'Scenario'

  // ── Called by VideoScene when the clip finishes ─────────────────────────────
  const handleVideoComplete = useCallback((frame?: string) => {
    if (currentNode.type === 'ending') {
      setPhase('ending')
    } else if (choices.length > 0) {
      if (frame) setFrozenFrame(frame)
      setPhase('choices')
    }
    // If no choices (incomplete draft node), stay showing the scene
  }, [currentNode.type, choices.length])

  // ── Called by ChoicePanel when the player picks a choice ────────────────────
  const handleChoiceSelect = useCallback((choice: ScenarioChoice) => {
    if (choice.feedback) {
      setPendingChoice(choice)
      setPhase('feedback')
    } else {
      commitAndAdvance(choice)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, scenario])

  // ── Called by FeedbackOverlay "Continue" button ──────────────────────────────
  const handleFeedbackContinue = useCallback(() => {
    if (!pendingChoice) return
    const choice = pendingChoice
    setPendingChoice(null)
    commitAndAdvance(choice)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingChoice, session, scenario])

  // ── Core: apply the choice, update session, trigger node transition ──────────
  function commitAndAdvance(choice: ScenarioChoice) {
    const newSession = advanceSession(session, scenario, choice.id)
    setSession(newSession)
    setFrozenFrame(null)
    setPhase('transitioning')
    // Short gap so AnimatePresence can exit the old VideoScene before mounting new
    setTimeout(() => setPhase('watching'), 350)
  }

  // ── Restart ──────────────────────────────────────────────────────────────────
  const handleRestart = useCallback(() => {
    setSession(createSession(scenario))
    setPendingChoice(null)
    setFrozenFrame(null)
    setPhase('watching')
  }, [scenario])

  if (!currentNode) return null

  return (
    <div className={contained ? 'absolute inset-0 bg-bg-0 overflow-hidden' : 'fixed inset-0 bg-bg-0 overflow-hidden'}>
      {/* Wide-screen ambient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,0.015) 0%, transparent 70%)',
        }}
      />

      {/* Content column — centered, phone-width on desktop */}
      <div className="relative h-full flex flex-col max-w-[520px] mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--line-1)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {backHref && (
              <Link
                href={backHref}
                className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-[var(--tint-3)]"
                style={{ color: 'var(--fg-3)' }}
              >
                <ArrowLeft size={16} />
              </Link>
            )}
            <div className="min-w-0">
              {mode === 'preview' && (
                <p className="text-[9px] font-mono text-neon-amber tracking-[0.18em] uppercase mb-0.5">
                  ⚠ Preview
                </p>
              )}
              <p className="text-sm font-medium text-ink-1 truncate">{scenarioTitle}</p>
            </div>
          </div>

          <PlayerProgress step={stepCount} />
        </header>

        {/* ── Main: video + overlays ──────────────────────────────────────────── */}
        <main className="relative flex-1 overflow-hidden">

          {/* Frozen frame / custom thumbnail backdrop — shown when choices are active */}
          <AnimatePresence>
            {phase === 'choices' && choiceBackground && (
              <motion.div
                key="choice-bg"
                className="absolute inset-0 z-[1]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                <img
                  src={choiceBackground}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ filter: 'blur(18px) brightness(0.35)', transform: 'scale(1.1)' }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* VideoScene — keyed to currentNodeId so it remounts on transition */}
          <AnimatePresence mode="wait">
            {phase !== 'transitioning' && (
              <motion.div
                key={session.currentNodeId}
                initial={{ opacity: 0 }}
                animate={{ opacity: phase === 'choices' && choiceBackground ? 0 : 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                <VideoScene
                  node={currentNode}
                  onComplete={handleVideoComplete}
                  autoAdvanceSeconds={currentNode.type === 'ending' ? 4 : 5}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* FeedbackOverlay — absolute, sits over the video */}
          <AnimatePresence>
            {phase === 'feedback' && pendingChoice?.feedback && (
              <FeedbackOverlay
                key="feedback"
                text={pendingChoice.feedback}
                scoreDeltas={pendingChoice.scoreEffects}
                onContinue={handleFeedbackContinue}
              />
            )}
          </AnimatePresence>

          {/* EndingScreen — absolute full takeover */}
          <AnimatePresence>
            {phase === 'ending' && (
              <EndingScreen
                key="ending"
                endingNode={currentNode}
                session={session}
                scenario={scenario}
                onRestart={handleRestart}
                mode={mode}
              />
            )}
          </AnimatePresence>
        </main>

        {/* ── ChoicePanel — slides up from below main ─────────────────────────── */}
        <AnimatePresence>
          {phase === 'choices' && choices.length > 0 && (
            <ChoicePanel
              key="choices"
              choices={choices}
              onSelect={handleChoiceSelect}
            />
          )}
        </AnimatePresence>

        {/* Dead-end notice (draft node with no choices) */}
        <AnimatePresence>
          {phase === 'choices' && choices.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="shrink-0 px-5 pb-8 pt-4 text-center"
            >
              <p className="text-sm font-mono text-ink-3">— no choices yet —</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
