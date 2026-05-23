'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
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

import { createPlayerSession, trackPlayerEvent } from '@/lib/analytics/track'

import type { Scenario, ScenarioVersion, PlayerSessionState, PlayerPhase, ScenarioChoice } from '@/types'

type ScenarioLike = Scenario | ScenarioVersion

function isScenarioVersion(s: ScenarioLike): s is ScenarioVersion {
  return 'scenarioId' in s && 'publishedAt' in s
}

interface ScenarioPlayerProps {
  scenario: ScenarioLike
  mode?: 'play' | 'preview'
  backHref?: string
  contained?: boolean // when true: relative positioning instead of fixed inset-0
  embed?: boolean    // when true: hide header (iframe embed mode)
}

export function ScenarioPlayer({ scenario, mode = 'play', backHref, contained = false, embed = false }: ScenarioPlayerProps) {
  const [session, setSession] = useState<PlayerSessionState>(() => createSession(scenario))
  const [phase, setPhase] = useState<PlayerPhase>('watching')
  const [pendingChoice, setPendingChoice] = useState<ScenarioChoice | null>(null)
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null)

  // Analytics refs — stable across renders, never cause re-renders
  const analyticsSessionId = useRef<string | null>(null)
  const sessionStartedAt = useRef<number>(Date.now())
  const sessionInitialized = useRef(false)
  const trackedNodes = useRef<Set<string>>(new Set())
  const sessionCompleted = useRef(false)

  // Initialize analytics session once on mount (play mode only)
  useEffect(() => {
    if (mode !== 'play' || sessionInitialized.current) return
    if (!isScenarioVersion(scenario)) return
    sessionInitialized.current = true

    const sid = crypto.randomUUID()
    analyticsSessionId.current = sid
    sessionStartedAt.current = Date.now()

    const base = {
      sessionId: sid,
      scenarioVersionId: scenario.id,
      scenarioId: scenario.scenarioId,
    }

    createPlayerSession({ ...base, slug: scenario.slug }).then(() => {
      trackPlayerEvent({ ...base, eventType: 'session_started' })
      const startNodeId = scenario.startNodeId
      if (startNodeId && !trackedNodes.current.has(startNodeId)) {
        trackedNodes.current.add(startNodeId)
        trackPlayerEvent({ ...base, eventType: 'node_viewed', nodeId: startNodeId })
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentNode = getNodeById(scenario, session.currentNodeId)
  const choices = getAvailableChoices(scenario, session.currentNodeId)

  // The background shown behind choices: custom thumbnail takes priority over captured frame
  const choiceBackground = currentNode?.thumbnailUrl ?? frozenFrame ?? null

  // Step count: non-ending nodes visited so far
  const stepCount = session.history.filter(id => !isEndingNode(scenario, id)).length

  const scenarioTitle = 'title' in scenario
    ? (scenario as Scenario).title
    : 'Scenario'

  function getAnalyticsBase() {
    if (mode !== 'play' || !isScenarioVersion(scenario) || !analyticsSessionId.current) return null
    return {
      sessionId: analyticsSessionId.current,
      scenarioVersionId: scenario.id,
      scenarioId: scenario.scenarioId,
    }
  }

  // ── Called by VideoScene when the clip finishes ─────────────────────────────
  const handleVideoComplete = useCallback((frame?: string) => {
    if (currentNode?.type === 'ending') {
      setPhase('ending')
    } else if (choices.length > 0) {
      if (frame) setFrozenFrame(frame)
      setPhase('choices')
    }
    // If no choices (incomplete draft node), stay showing the scene
  }, [currentNode?.type, choices.length])

  // ── Called by ChoicePanel when the player picks a choice ────────────────────
  const handleChoiceSelect = useCallback((choice: ScenarioChoice) => {
    const base = getAnalyticsBase()
    if (base) {
      trackPlayerEvent({
        ...base,
        eventType: 'choice_selected',
        nodeId: session.currentNodeId,
        choiceId: choice.id,
        targetNodeId: choice.targetNodeId,
        metadata: choice.scoreEffects ? { scoreEffects: choice.scoreEffects } : {},
      })
    }
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
    const base = getAnalyticsBase()
    if (base) {
      trackPlayerEvent({
        ...base,
        eventType: 'feedback_viewed',
        nodeId: session.currentNodeId,
        choiceId: choice.id,
      })
    }
    setPendingChoice(null)
    commitAndAdvance(choice)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingChoice, session, scenario])

  // ── Core: apply the choice, update session, trigger node transition ──────────
  function commitAndAdvance(choice: ScenarioChoice) {
    const newSession = advanceSession(session, scenario, choice.id)

    // Track next node viewed (after advancing)
    const base = getAnalyticsBase()
    if (base && newSession.currentNodeId && !trackedNodes.current.has(newSession.currentNodeId)) {
      trackedNodes.current.add(newSession.currentNodeId)
      const nextNode = getNodeById(scenario, newSession.currentNodeId)
      if (nextNode?.type === 'ending') {
        const durationSeconds = Math.round((Date.now() - sessionStartedAt.current) / 1000)
        if (!sessionCompleted.current) {
          sessionCompleted.current = true
          trackPlayerEvent({
            ...base,
            eventType: 'ending_reached',
            endingNodeId: newSession.currentNodeId,
            score: Object.keys(newSession.score).length > 0 ? newSession.score : undefined,
            metadata: { durationSeconds, path: newSession.history },
          })
          trackPlayerEvent({
            ...base,
            eventType: 'session_completed',
            score: Object.keys(newSession.score).length > 0 ? newSession.score : undefined,
            metadata: { durationSeconds },
          })
        }
      } else {
        trackPlayerEvent({ ...base, eventType: 'node_viewed', nodeId: newSession.currentNodeId })
      }
    }

    setSession(newSession)
    setFrozenFrame(null)
    setPhase('transitioning')
    // Short gap so AnimatePresence can exit the old VideoScene before mounting new
    setTimeout(() => setPhase('watching'), 350)
  }

  // ── Restart ──────────────────────────────────────────────────────────────────
  const handleRestart = useCallback(() => {
    // Reset analytics tracking for a new run through the same session connection
    trackedNodes.current = new Set()
    sessionCompleted.current = false
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

      {/* Content column — full width; choice panel constrains its own inner width */}
      <div className="relative h-full flex flex-col">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        {!embed && <header
          className="flex items-center justify-between px-5 py-4 shrink-0 max-w-[900px] mx-auto w-full"
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
        </header>}

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
                  node={currentNode!}
                  onComplete={handleVideoComplete}
                  autoAdvanceSeconds={currentNode?.type === 'ending' ? 4 : 5}
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
