'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react'

import { VideoScene } from './VideoScene'
import { YouTubeScene } from './YouTubeScene'
import { ChoicePanel } from './ChoicePanel'
import { FeedbackOverlay } from './FeedbackOverlay'
import { EndingScreen } from './EndingScreen'
import { OpeningInstructionsScreen } from './OpeningInstructionsScreen'
import { RotateDeviceHint } from './RotateDeviceHint'

import {
  createSession,
  advanceSession,
  restartFromCheckpoint,
  getNodeById,
  getAvailableChoices,
} from '@/lib/scenario-engine'
import {
  saveCheckpointToStorage,
  loadCheckpointFromStorage,
  clearCheckpointFromStorage,
} from '@/lib/checkpoint-storage'

import { createPlayerSession, trackPlayerEvent, completePlayerSession } from '@/lib/analytics/track'

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
  const [session, setSession] = useState<PlayerSessionState>(() => {
    const initial = createSession(scenario)
    const scenarioId = 'scenarioId' in scenario ? scenario.scenarioId : scenario.id
    const saved = loadCheckpointFromStorage(scenarioId)
    if (saved && scenario.nodes.some(n => n.id === saved.nodeId)) {
      return { ...initial, latestCheckpoint: saved }
    }
    return initial
  })
  const [phase, setPhase] = useState<PlayerPhase>('watching')
  const [pendingChoice, setPendingChoice] = useState<ScenarioChoice | null>(null)

  // Opening instructions — only shown at the very start when enabled on the start node
  const [showInstructions, setShowInstructions] = useState<boolean>(() => {
    const sNode = getNodeById(scenario, scenario.startNodeId)
    return !!(sNode?.openingInstructions?.enabled)
  })

  // Rotate-device hint — shown once on portrait mobile when scenario has any video content
  const [showRotateHint, setShowRotateHint] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const hasVideoContent = scenario.nodes.some(n => !!n.youtubeAsset || !!n.clip)
    if (!hasVideoContent) return false
    return window.matchMedia('(max-width: 768px) and (orientation: portrait)').matches
  })

  // Fullscreen
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {
      // Fullscreen API unavailable or permission denied (e.g. iOS Safari)
    }
  }, [])

  // Analytics refs — stable across renders, never cause re-renders
  const analyticsSessionId = useRef<string | null>(null)
  const sessionStartedAt = useRef<number>(Date.now())
  const sessionInitialized = useRef(false)
  const trackedNodes = useRef<Set<string>>(new Set())
  const trackedChoiceViews = useRef<Set<string>>(new Set())
  const sessionCompleted = useRef(false)
  const restartCount = useRef(0)

  // Helper: a node "plays a video" if it has a clip or YouTube asset attached.
  const hasVideoContent = useCallback((node: ReturnType<typeof getNodeById>) => {
    return !!(node && (node.clip || node.youtubeAsset))
  }, [])

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
        const startNode = getNodeById(scenario, startNodeId)
        if (hasVideoContent(startNode)) {
          trackPlayerEvent({ ...base, eventType: 'video_started', nodeId: startNodeId })
        }
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentNode = getNodeById(scenario, session.currentNodeId)
  const choices = getAvailableChoices(scenario, session.currentNodeId)

  // ── Checkpoint detection ─────────────────────────────────────────────────────
  useEffect(() => {
    const node = getNodeById(scenario, session.currentNodeId)
    if (!node?.isCheckpoint) return
    const scenarioId = 'scenarioId' in scenario ? scenario.scenarioId : scenario.id
    const label = node.checkpointLabel?.trim() || node.title || 'Checkpoint'
    const newCheckpoint = {
      nodeId: node.id,
      label,
      reachedAt: new Date().toISOString(),
      pathIndex: session.history.length - 1,
    }
    setSession(prev => ({ ...prev, latestCheckpoint: newCheckpoint }))
    saveCheckpointToStorage(scenarioId, newCheckpoint)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.currentNodeId])

  // ── Track choice_viewed once per node when the choice panel appears ──────────
  useEffect(() => {
    if (phase !== 'choices' || choices.length === 0) return
    const nodeId = session.currentNodeId
    if (trackedChoiceViews.current.has(nodeId)) return
    trackedChoiceViews.current.add(nodeId)
    const base = getAnalyticsBase()
    if (base) trackPlayerEvent({ ...base, eventType: 'choice_viewed', nodeId })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, session.currentNodeId, choices.length])

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
  const handleVideoComplete = useCallback(() => {
    const base = getAnalyticsBase()
    if (base && currentNode && hasVideoContent(currentNode)) {
      trackPlayerEvent({ ...base, eventType: 'video_completed', nodeId: currentNode.id })
    }
    if (currentNode?.type === 'ending') {
      setPhase('ending')
    } else if (choices.length > 0) {
      setPhase('choices')
    }
    // If no choices (incomplete draft node), stay showing the scene
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNode?.type, currentNode?.id, choices.length])

  // ── Called by ChoicePanel when the player picks a choice ────────────────────
  const handleChoiceSelect = useCallback((choice: ScenarioChoice) => {
    const base = getAnalyticsBase()
    if (base) {
      const scoreDelta = choice.scoreEffects
        ? Math.round(Object.values(choice.scoreEffects).reduce((a, b) => a + b, 0))
        : undefined
      trackPlayerEvent({
        ...base,
        eventType: 'choice_selected',
        nodeId: session.currentNodeId,
        choiceId: choice.id,
        choiceLabel: choice.label,
        targetNodeId: choice.targetNodeId,
        scoreDelta,
        score: choice.scoreEffects,
        metadata: choice.scoreEffects ? { scoreEffects: choice.scoreEffects } : {},
      })
    }
    if (choice.feedback) {
      // Fire feedback_viewed when the overlay is actually shown to the player,
      // not on "Continue" — that's when the feedback content is consumed.
      if (base) {
        trackPlayerEvent({
          ...base,
          eventType: 'feedback_viewed',
          nodeId: session.currentNodeId,
          choiceId: choice.id,
          choiceLabel: choice.label,
        })
      }
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

    // Track next node viewed (after advancing)
    const base = getAnalyticsBase()
    if (base && newSession.currentNodeId && !trackedNodes.current.has(newSession.currentNodeId)) {
      trackedNodes.current.add(newSession.currentNodeId)
      const nextNode = getNodeById(scenario, newSession.currentNodeId)
      if (nextNode?.type === 'ending') {
        const durationSeconds = Math.round((Date.now() - sessionStartedAt.current) / 1000)
        const hasScore = Object.keys(newSession.score).length > 0
        const totalScore = hasScore
          ? Math.round(Object.values(newSession.score).reduce((a, b) => a + b, 0))
          : undefined
        if (!sessionCompleted.current) {
          sessionCompleted.current = true
          trackPlayerEvent({
            ...base,
            eventType: 'ending_reached',
            endingNodeId: newSession.currentNodeId,
            score: hasScore ? newSession.score : undefined,
            scoreDelta: totalScore,
            metadata: { durationSeconds, path: newSession.history },
          })
          trackPlayerEvent({
            ...base,
            eventType: 'session_completed',
            score: hasScore ? newSession.score : undefined,
            scoreDelta: totalScore,
            metadata: { durationSeconds },
          })
          completePlayerSession({
            sessionId: base.sessionId,
            scenarioVersionId: base.scenarioVersionId,
            endingNodeId: newSession.currentNodeId,
            totalScore,
            durationSeconds,
          })
        }
      } else {
        trackPlayerEvent({ ...base, eventType: 'node_viewed', nodeId: newSession.currentNodeId })
        if (hasVideoContent(nextNode)) {
          trackPlayerEvent({ ...base, eventType: 'video_started', nodeId: newSession.currentNodeId })
        }
      }
    }

    setSession(newSession)
    setPhase('transitioning')
    // Short gap so AnimatePresence can exit the old VideoScene before mounting new
    setTimeout(() => setPhase('watching'), 350)
  }

  // ── Restart ──────────────────────────────────────────────────────────────────
  //
  // Restarting records a `session_restarted` event on the SAME analytics session
  // rather than minting a new one. A restart is a continuation of one visitor's
  // engagement with the scenario (most often from the ending screen), not a
  // fresh, independent play — starting a new session row would double-count
  // that visit in `totalPlays`/funnel numbers and fragment its path across two
  // rows. Replaying node/choice events is fine: trackedNodes/trackedChoiceViews
  // reset below so the new playthrough's events are recorded too, exactly as
  // they would be for any other pass through the graph.
  function trackRestart(fromNodeId: string) {
    restartCount.current += 1
    const base = getAnalyticsBase()
    if (base) {
      trackPlayerEvent({
        ...base,
        eventType: 'session_restarted',
        nodeId: fromNodeId,
        metadata: { restartCount: restartCount.current },
      })
    }
    trackedNodes.current = new Set()
    trackedChoiceViews.current = new Set()
    sessionCompleted.current = false
    sessionStartedAt.current = Date.now()
  }

  const handleRestart = useCallback(() => {
    trackRestart(session.currentNodeId)
    const scenarioId = 'scenarioId' in scenario ? scenario.scenarioId : scenario.id
    clearCheckpointFromStorage(scenarioId)
    setSession(createSession(scenario))
    setPendingChoice(null)
    setPhase('watching')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, session.currentNodeId])

  const handleRestartFromCheckpoint = useCallback(() => {
    trackRestart(session.currentNodeId)
    setSession(prev => restartFromCheckpoint(prev, scenario))
    setPendingChoice(null)
    setPhase('watching')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, session.currentNodeId])

  if (!currentNode) return null

  const startNode = getNodeById(scenario, scenario.startNodeId)

  return (
    <div ref={containerRef} className={contained ? 'absolute inset-0 bg-bg-0 overflow-hidden' : 'fixed inset-0 bg-bg-0 overflow-hidden'}>
      {/* Wide-screen ambient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,0.015) 0%, transparent 70%)',
        }}
      />

      {/* Content column */}
      <div className="relative h-full flex flex-col">

        {/* ── Header — preview mode only ──────────────────────────────────────── */}
        {mode === 'preview' && !embed && (
          <header
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
                <p className="text-[9px] font-mono text-neon-amber tracking-[0.18em] uppercase mb-0.5">
                  ⚠ Preview
                </p>
                <p className="text-sm font-medium text-ink-1 truncate">{scenarioTitle}</p>
              </div>
            </div>
          </header>
        )}

        {/* ── Main: video + all overlays ──────────────────────────────────────── */}
        <main className="relative flex-1 overflow-hidden">

          {/* Rotate-device hint — shown before first video on portrait mobile */}
          <AnimatePresence>
            {showRotateHint && (
              <RotateDeviceHint
                key="rotate-hint"
                onDismiss={() => setShowRotateHint(false)}
              />
            )}
          </AnimatePresence>

          {/* Opening instructions — full overlay before first video */}
          <AnimatePresence>
            {!showRotateHint && showInstructions && startNode?.openingInstructions && (
              <OpeningInstructionsScreen
                key="instructions"
                title={startNode.openingInstructions.title}
                body={startNode.openingInstructions.body}
                startButtonText={startNode.openingInstructions.startButtonText}
                onStart={() => setShowInstructions(false)}
              />
            )}
          </AnimatePresence>

          {/* VideoScene — keyed to currentNodeId so it remounts on transition */}
          <AnimatePresence mode="wait">
            {!showRotateHint && !showInstructions && phase !== 'transitioning' && (
              <motion.div
                key={session.currentNodeId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                {currentNode!.youtubeAsset ? (
                  <YouTubeScene
                    node={currentNode!}
                    onComplete={handleVideoComplete}
                  />
                ) : (
                  <VideoScene
                    node={currentNode!}
                    onComplete={handleVideoComplete}
                    autoAdvanceSeconds={currentNode?.type === 'ending' ? 4 : 5}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ChoicePanel — glass overlay anchored to bottom of video */}
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
                className="absolute bottom-8 left-0 right-0 text-center pointer-events-none"
              >
                <p className="text-sm font-mono text-ink-3">— no choices yet —</p>
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
                onRestartFromCheckpoint={handleRestartFromCheckpoint}
                mode={mode}
              />
            )}
          </AnimatePresence>

          {/* Fullscreen toggle — play mode only, always on top */}
          {mode === 'play' && !embed && (
            <button
              onClick={toggleFullscreen}
              className="absolute top-3 right-3 z-50 w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-95"
              style={{
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.55)',
                backdropFilter: 'blur(6px)',
              }}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          )}
        </main>
      </div>
    </div>
  )
}
