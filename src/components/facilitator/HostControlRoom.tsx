'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Loader2, Users, Copy, Check, Play, Vote, Eye,
  MessageCircle, ArrowRight, Square, ExternalLink, Download, ClipboardCopy, Radio,
} from 'lucide-react'
import { isSupabaseMode } from '@/lib/persistence/mode'
import { getNodeById, getAvailableChoices, isEndingNode } from '@/lib/scenario-engine'
import {
  getFacilitatorSession,
  fetchScenarioVersion,
  subscribeToRoom,
  tallyVotes,
  majorityChoiceId,
  startFacilitatorSession,
  openVoting,
  revealResults,
  startDiscussion,
  chooseAndAdvance,
  endFacilitatorSession,
  buildDebriefPrompts,
  buildSessionSummary,
  summaryToText,
  summaryToCsv,
} from '@/lib/facilitator'
import { getScenarioById } from '@/lib/persistence/scenarios'
import { SceneMedia } from './SceneMedia'
import type { Scenario, ScenarioVersion, ScenarioNode } from '@/types'
import type {
  FacilitatorSession, FacilitatorParticipant, FacilitatorVote,
  FacilitatorVoteTally, FacilitatorDecision,
} from '@/types/facilitator'

interface Props {
  sessionId: string
}

export function HostControlRoom({ sessionId }: Props) {
  const [session, setSession] = useState<FacilitatorSession | null>(null)
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [version, setVersion] = useState<ScenarioVersion | null>(null)
  const [participants, setParticipants] = useState<FacilitatorParticipant[]>([])
  const [votes, setVotes] = useState<FacilitatorVote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Initial load
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const s = await getFacilitatorSession(sessionId)
        if (!s) { if (!cancelled) setError('Session not found'); return }
        const [sc, ver] = await Promise.all([
          getScenarioById(s.scenarioId),
          fetchScenarioVersion(s.scenarioVersionId),
        ])
        if (cancelled) return
        if (!sc || !ver) { setError('Scenario data unavailable'); return }
        setSession(s)
        setScenario(sc)
        setVersion(ver)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load session')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [sessionId])

  // Realtime room subscription. Guarded: subscribeToRoom creates a Supabase
  // client synchronously, which throws if Supabase isn't configured (e.g.
  // local persistence mode) — without this guard that throw escapes the
  // effect uncaught and crashes the whole page instead of showing the
  // friendly "Failed to load session" state set by the initial-load effect.
  useEffect(() => {
    try {
      const unsubscribe = subscribeToRoom(sessionId, {
        onSession: setSession,
        onParticipants: setParticipants,
        onVotes: setVotes,
      })
      return unsubscribe
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect to session')
      return undefined
    }
  }, [sessionId])

  const currentNode = useMemo<ScenarioNode | null>(
    () => (version && session?.currentNodeId ? getNodeById(version, session.currentNodeId) ?? null : null),
    [version, session?.currentNodeId]
  )

  const { tallies, totalVotes } = useMemo(
    () => version ? tallyVotes(version, session?.currentNodeId ?? null, votes) : { tallies: [], totalVotes: 0 },
    [version, session?.currentNodeId, votes]
  )

  const majority = useMemo(() => majorityChoiceId(tallies), [tallies])

  const withBusy = useCallback(async (fn: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }, [busy])

  // ── Control actions ─────────────────────────────────────────────────────────

  const handleStart = () => withBusy(async () => {
    if (!session || !version) return
    await startFacilitatorSession(session.id, version.startNodeId)
  })

  const handleOpenVoting = () => withBusy(async () => {
    if (!session || !currentNode) return
    await openVoting(session.id, currentNode.id)
  })

  const handleRevealResults = () => withBusy(async () => {
    if (!session || !currentNode) return
    await revealResults(session.id, currentNode.id)
  })

  const handleStartDiscussion = () => withBusy(async () => {
    if (!session || !currentNode) return
    await startDiscussion(session.id, currentNode.id)
  })

  const handleChoosePath = (choiceId: string) => withBusy(async () => {
    if (!session || !currentNode || !version) return
    const choice = currentNode.choices.find(c => c.id === choiceId)
    if (!choice) return
    const decision: FacilitatorDecision = {
      nodeId: currentNode.id,
      nodeTitle: currentNode.title,
      choiceId: choice.id,
      choiceLabel: choice.label,
      followedMajority: majority === choice.id,
      voteCounts: Object.fromEntries(tallies.map(t => [t.choiceId, t.count])),
      totalVotes,
      decidedAt: new Date().toISOString(),
    }
    await chooseAndAdvance(session, decision, choice.targetNodeId)
  })

  const handleEndSession = () => withBusy(async () => {
    if (!session || !currentNode) return
    await endFacilitatorSession(session.id, isEndingNode(version!, currentNode.id) ? currentNode.id : null)
  })

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!isSupabaseMode()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-6">
        <Radio className="w-8 h-8 text-[var(--fg-3)]" />
        <h2 className="text-lg font-semibold text-[var(--fg-1)]">Facilitator Mode requires Supabase</h2>
        <p className="text-sm text-[var(--fg-3)] max-w-sm">
          This feature is not available in local mode. Configure a Supabase project to use facilitator sessions.
        </p>
        <Link href="/dashboard" className="text-sm text-[var(--accent)] underline underline-offset-2">
          Back to dashboard
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0b10' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: '#5c6273' }} />
      </div>
    )
  }

  if (error || !session || !scenario || !version) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: '#0a0b10' }}>
        <p className="text-sm font-mono" style={{ color: '#c9cdda' }}>{error ?? 'Unable to load session'}</p>
        <Link href="/dashboard" className="text-xs font-mono underline underline-offset-4" style={{ color: '#5c6273' }}>
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0b10', color: '#e7e9f0' }}>
      <RoomHeader scenario={scenario} session={session} participantCount={participants.length} />

      <div className="max-w-6xl mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          {session.status === 'waiting' ? (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <WaitingRoom
                session={session}
                participants={participants}
                startNode={getNodeById(version, version.startNodeId) ?? null}
                onStart={handleStart}
                busy={busy}
              />
            </motion.div>
          ) : session.status === 'live' ? (
            <motion.div
              key={`live-${session.phase}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <LiveRoom
                session={session}
                version={version}
                currentNode={currentNode}
                participants={participants}
                tallies={tallies}
                totalVotes={totalVotes}
                majority={majority}
                busy={busy}
                onOpenVoting={handleOpenVoting}
                onRevealResults={handleRevealResults}
                onStartDiscussion={handleStartDiscussion}
                onChoosePath={handleChoosePath}
                onEndSession={handleEndSession}
              />
            </motion.div>
          ) : (
            <motion.div
              key="ended"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <SessionSummaryView
                session={session}
                scenario={scenario}
                version={version}
                participantCount={participants.length}
                totalVotesAllTime={votes.length}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Header ────────────────────────────────────────────────────────────────────

function RoomHeader({ scenario, session, participantCount }: {
  scenario: Scenario
  session: FacilitatorSession
  participantCount: number
}) {
  return (
    <div className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-white/5" style={{ color: '#8a90a4' }}>
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0">
          <p className="text-[10px] font-mono tracking-widest uppercase mb-0.5" style={{ color: '#5c6273' }}>
            Facilitator session
          </p>
          <h1 className="text-base font-semibold truncate">{scenario.title}</h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono" style={{ background: 'rgba(255,255,255,0.04)', color: '#c9cdda' }}>
            <Users size={12} />
            {participantCount}
          </div>
          <StatusPill session={session} />
        </div>
      </div>
    </div>
  )
}

function StatusPill({ session }: { session: FacilitatorSession }) {
  const cfg = session.status === 'live'
    ? { label: 'Live', color: 'oklch(82% 0.18 165)', bg: 'oklch(82% 0.18 165 / 0.12)' }
    : session.status === 'ended'
    ? { label: 'Ended', color: '#8a90a4', bg: 'rgba(255,255,255,0.04)' }
    : { label: 'Waiting', color: '#c9b85c', bg: 'rgba(201,184,92,0.12)' }
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono" style={{ background: cfg.bg, color: cfg.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </div>
  )
}

// ── Waiting room ──────────────────────────────────────────────────────────────

function WaitingRoom({ session, participants, startNode, onStart, busy }: {
  session: FacilitatorSession
  participants: FacilitatorParticipant[]
  startNode: ScenarioNode | null
  onStart: () => void
  busy: boolean
}) {
  const [copied, setCopied] = useState(false)
  const joinUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/join/${session.joinCode}`
  }, [session.joinCode])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch { /* clipboard unavailable — link is still visible to copy manually */ }
  }

  return (
    <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6">
      <div
        className="rounded-3xl p-10 flex flex-col items-center justify-center text-center gap-5"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-[11px] font-mono tracking-widest uppercase" style={{ color: '#5c6273' }}>
          Participants join at
        </p>
        <p className="text-lg font-mono" style={{ color: '#c9cdda' }}>branchlab.app/join</p>
        <div
          className="flex items-center gap-3 px-8 py-5 rounded-2xl text-5xl font-mono font-bold tracking-[0.3em]"
          style={{ background: 'oklch(82% 0.18 165 / 0.08)', border: '1px solid oklch(82% 0.18 165 / 0.3)', color: 'oklch(82% 0.18 165)' }}
        >
          {session.joinCode}
        </div>
        <button
          onClick={copyLink}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono transition-colors hover:bg-white/5"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#c9cdda' }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Link copied' : 'Copy join link'}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[11px] font-mono tracking-widest uppercase mb-3" style={{ color: '#5c6273' }}>
            Participants ({participants.length})
          </p>
          {participants.length === 0 ? (
            <p className="text-sm font-mono" style={{ color: '#5c6273' }}>
              Waiting for people to join with the code above…
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {participants.map(p => (
                <span
                  key={p.id}
                  className="px-3 py-1.5 rounded-full text-xs font-mono"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#e7e9f0' }}
                >
                  {p.displayName?.trim() || 'Anonymous'}
                </span>
              ))}
            </div>
          )}
        </div>

        {startNode && (
          <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <SceneMedia node={startNode} className="w-32 shrink-0" aspectRatio="16/9" />
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: '#5c6273' }}>Opens with</p>
              <p className="text-sm font-medium truncate">{startNode.title}</p>
            </div>
          </div>
        )}

        <button
          onClick={onStart}
          disabled={busy}
          className="mt-auto flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm font-mono font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: 'oklch(82% 0.18 165)', color: '#0a0b10' }}
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          Start session
        </button>
        <p className="text-[11px] font-mono text-center" style={{ color: '#5c6273' }}>
          You can start any time — late joiners can still hop in mid-session.
        </p>
      </div>
    </div>
  )
}

// ── Live room ─────────────────────────────────────────────────────────────────

function LiveRoom(props: {
  session: FacilitatorSession
  version: ScenarioVersion
  currentNode: ScenarioNode | null
  participants: FacilitatorParticipant[]
  tallies: FacilitatorVoteTally[]
  totalVotes: number
  majority: string | null
  busy: boolean
  onOpenVoting: () => void
  onRevealResults: () => void
  onStartDiscussion: () => void
  onChoosePath: (choiceId: string) => void
  onEndSession: () => void
}) {
  const { session, version, currentNode, participants, tallies, totalVotes, majority, busy } = props

  if (!currentNode) {
    return <p className="text-sm font-mono" style={{ color: '#5c6273' }}>This scene is no longer in the published version.</p>
  }

  const choices = getAvailableChoices(version, currentNode.id)
  const ending = isEndingNode(version, currentNode.id)

  return (
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
      <div className="space-y-4">
        <SceneMedia node={currentNode} aspectRatio="16/9" />
        <JoinCodeBanner joinCode={session.joinCode} participantCount={participants.length} />
      </div>

      <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {ending ? (
          <EndingPanel node={currentNode} onEndSession={props.onEndSession} busy={busy} />
        ) : choices.length === 0 ? (
          <p className="text-sm font-mono" style={{ color: '#5c6273' }}>This scene has no choices configured.</p>
        ) : session.phase === 'showing_scene' ? (
          <ShowingScenePanel node={currentNode} choices={choices} onOpenVoting={props.onOpenVoting} busy={busy} />
        ) : session.phase === 'voting_open' ? (
          <VotingOpenPanel choices={choices} totalVotes={totalVotes} onRevealResults={props.onRevealResults} busy={busy} />
        ) : session.phase === 'results_revealed' ? (
          <ResultsPanel tallies={tallies} totalVotes={totalVotes} majority={majority} onStartDiscussion={props.onStartDiscussion} busy={busy} />
        ) : session.phase === 'discussing' ? (
          <DiscussionPanel
            node={currentNode}
            choices={choices}
            tallies={tallies}
            totalVotes={totalVotes}
            majority={majority}
            onChoosePath={props.onChoosePath}
            busy={busy}
          />
        ) : null}
      </div>
    </div>
  )
}

function JoinCodeBanner({ joinCode, participantCount }: { joinCode: string; participantCount: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl px-5 py-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2 text-xs font-mono" style={{ color: '#5c6273' }}>
        <span>Join code</span>
        <span className="text-base font-semibold tracking-[0.2em]" style={{ color: 'oklch(82% 0.18 165)' }}>{joinCode}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: '#c9cdda' }}>
        <Users size={12} />
        {participantCount} in the room
      </div>
    </div>
  )
}

function PanelHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest uppercase" style={{ color: '#5c6273' }}>
      {icon}
      {label}
    </div>
  )
}

function ShowingScenePanel({ node, choices, onOpenVoting, busy }: {
  node: ScenarioNode; choices: ScenarioNode['choices']; onOpenVoting: () => void; busy: boolean
}) {
  return (
    <>
      <PanelHeader icon={<Eye size={13} />} label="Showing scene" />
      <p className="text-sm" style={{ color: '#c9cdda' }}>
        Play "{node.title}" for the room, then open voting when everyone has watched.
      </p>
      <div className="space-y-1.5">
        {choices.map(c => (
          <div key={c.id} className="px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.03)', color: '#e7e9f0' }}>
            {c.label}
          </div>
        ))}
      </div>
      <button
        onClick={onOpenVoting}
        disabled={busy}
        className="mt-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-mono font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: 'oklch(82% 0.18 165)', color: '#0a0b10' }}
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Vote size={15} />}
        Open voting
      </button>
    </>
  )
}

function VotingOpenPanel({ choices, totalVotes, onRevealResults, busy }: {
  choices: ScenarioNode['choices']; totalVotes: number; onRevealResults: () => void; busy: boolean
}) {
  return (
    <>
      <PanelHeader icon={<Vote size={13} />} label="Voting open" />
      <p className="text-sm" style={{ color: '#c9cdda' }}>
        Participants are voting now. The breakdown stays hidden until you reveal it.
      </p>
      <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <motion.span
          key={totalVotes}
          initial={{ scale: 1.15, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-mono font-bold"
          style={{ color: 'oklch(82% 0.18 165)' }}
        >
          {totalVotes}
        </motion.span>
        <span className="text-xs font-mono" style={{ color: '#5c6273' }}>
          {totalVotes === 1 ? 'vote cast' : 'votes cast'}
        </span>
      </div>
      <div className="space-y-1.5">
        {choices.map(c => (
          <div key={c.id} className="px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.03)', color: '#8a90a4' }}>
            {c.label}
          </div>
        ))}
      </div>
      <button
        onClick={onRevealResults}
        disabled={busy}
        className="mt-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-mono font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: 'oklch(82% 0.18 165)', color: '#0a0b10' }}
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
        Reveal results
      </button>
    </>
  )
}

function ResultsPanel({ tallies, totalVotes, majority, onStartDiscussion, busy }: {
  tallies: FacilitatorVoteTally[]; totalVotes: number; majority: string | null
  onStartDiscussion: () => void; busy: boolean
}) {
  return (
    <>
      <PanelHeader icon={<Eye size={13} />} label="Results revealed" />
      <p className="text-sm" style={{ color: '#c9cdda' }}>
        {totalVotes === 0 ? 'No votes were cast on this scene.' : `${totalVotes} ${totalVotes === 1 ? 'vote' : 'votes'} total — here's how the room split:`}
      </p>
      <div className="space-y-2.5">
        {tallies.map(t => (
          <VoteBar key={t.choiceId} tally={t} highlighted={t.choiceId === majority} />
        ))}
      </div>
      {majority && (
        <p className="text-xs font-mono px-3 py-2 rounded-lg" style={{ background: 'oklch(82% 0.18 165 / 0.08)', color: 'oklch(82% 0.18 165)' }}>
          Most participants chose: {tallies.find(t => t.choiceId === majority)?.label}
        </p>
      )}
      <button
        onClick={onStartDiscussion}
        disabled={busy}
        className="mt-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-mono font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: 'oklch(82% 0.18 165)', color: '#0a0b10' }}
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
        Start discussion
      </button>
    </>
  )
}

function VoteBar({ tally, highlighted }: { tally: FacilitatorVoteTally; highlighted: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-xs font-mono">
        <span style={{ color: highlighted ? 'oklch(82% 0.18 165)' : '#c9cdda' }}>{tally.label}</span>
        <span style={{ color: '#5c6273' }}>{tally.count} · {Math.round(tally.percentage)}%</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${tally.percentage}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: highlighted ? 'oklch(82% 0.18 165)' : '#5c6273' }}
        />
      </div>
    </div>
  )
}

function DiscussionPanel({ node, choices, tallies, totalVotes, majority, onChoosePath, busy }: {
  node: ScenarioNode
  choices: ScenarioNode['choices']
  tallies: FacilitatorVoteTally[]
  totalVotes: number
  majority: string | null
  onChoosePath: (choiceId: string) => void
  busy: boolean
}) {
  const prompts = useMemo(() => buildDebriefPrompts(node, tallies, totalVotes), [node, tallies, totalVotes])
  const [confirming, setConfirming] = useState<string | null>(null)

  return (
    <>
      <PanelHeader icon={<MessageCircle size={13} />} label="Discussing" />
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {prompts.map(p => (
          <div key={p.id} className="px-3 py-2 rounded-lg text-xs leading-relaxed" style={{ background: 'rgba(255,255,255,0.03)', color: '#c9cdda' }}>
            {p.text}
          </div>
        ))}
      </div>

      <div className="border-t pt-4 space-y-2.5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] font-mono tracking-widest uppercase" style={{ color: '#5c6273' }}>
          Choose the path forward
        </p>
        <p className="text-[11px] font-mono" style={{ color: '#5c6273' }}>
          You decide where the story goes — the vote is context, not a verdict.
        </p>
        {choices.map(c => {
          const tally = tallies.find(t => t.choiceId === c.id)
          const isMajority = c.id === majority
          const isConfirming = confirming === c.id
          return (
            <div key={c.id} className="flex items-center gap-2">
              <button
                onClick={() => isConfirming ? onChoosePath(c.id) : setConfirming(c.id)}
                disabled={busy}
                className="flex-1 flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm text-left transition-colors disabled:opacity-60"
                style={{
                  background: isConfirming ? 'oklch(82% 0.18 165 / 0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isConfirming ? 'oklch(82% 0.18 165 / 0.4)' : 'rgba(255,255,255,0.06)'}`,
                  color: '#e7e9f0',
                }}
              >
                <span className="flex items-center gap-2">
                  {c.label}
                  {isMajority && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: 'oklch(82% 0.18 165 / 0.15)', color: 'oklch(82% 0.18 165)' }}>
                      majority
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2 text-xs font-mono shrink-0" style={{ color: '#5c6273' }}>
                  {tally ? `${tally.count} · ${Math.round(tally.percentage)}%` : '0'}
                  {isConfirming ? <Check size={14} style={{ color: 'oklch(82% 0.18 165)' }} /> : <ArrowRight size={14} />}
                </span>
              </button>
              {isConfirming && (
                <button
                  onClick={() => setConfirming(null)}
                  className="px-3 py-3 rounded-xl text-xs font-mono"
                  style={{ color: '#5c6273', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  Cancel
                </button>
              )}
            </div>
          )
        })}
        {confirming && (
          <p className="text-[11px] font-mono text-center" style={{ color: '#c9b85c' }}>
            Click again to confirm — this advances the whole room.
          </p>
        )}
      </div>
    </>
  )
}

function EndingPanel({ node, onEndSession, busy }: { node: ScenarioNode; onEndSession: () => void; busy: boolean }) {
  return (
    <>
      <PanelHeader icon={<Square size={13} />} label="Ending reached" />
      <p className="text-sm" style={{ color: '#c9cdda' }}>
        The group has arrived at "{node.title}". Wrap up the discussion, then end the session to see the full summary.
      </p>
      <button
        onClick={onEndSession}
        disabled={busy}
        className="mt-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-mono font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: 'oklch(82% 0.18 165)', color: '#0a0b10' }}
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Square size={15} />}
        End session & view summary
      </button>
    </>
  )
}

// ── Summary ───────────────────────────────────────────────────────────────────

function SessionSummaryView({ session, scenario, version, participantCount, totalVotesAllTime }: {
  session: FacilitatorSession
  scenario: Scenario
  version: ScenarioVersion
  participantCount: number
  totalVotesAllTime: number
}) {
  const [copied, setCopied] = useState(false)
  const summary = useMemo(
    () => buildSessionSummary(session, scenario, version, participantCount, totalVotesAllTime),
    [session, scenario, version, participantCount, totalVotesAllTime]
  )

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(summaryToText(summary))
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch { /* clipboard unavailable */ }
  }

  const downloadCsv = () => {
    const blob = new Blob([summaryToCsv(summary)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${scenario.slug || scenario.id}-facilitator-${session.joinCode.toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <p className="text-[11px] font-mono tracking-widest uppercase" style={{ color: '#5c6273' }}>Session ended</p>
        <h2 className="text-xl font-semibold">{scenario.title}</h2>
        <p className="text-xs font-mono" style={{ color: '#5c6273' }}>Join code {session.joinCode}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Participants" value={String(summary.participantCount)} />
        <StatCard label="Total votes" value={String(summary.totalVotes)} />
        <StatCard label="Duration" value={formatDuration(summary.durationSeconds)} />
      </div>

      {summary.endingTitle && (
        <div className="rounded-2xl px-5 py-3 text-sm font-mono text-center" style={{ background: 'oklch(82% 0.18 165 / 0.08)', color: 'oklch(82% 0.18 165)' }}>
          Ending reached: {summary.endingTitle}
        </div>
      )}

      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] font-mono tracking-widest uppercase mb-3" style={{ color: '#5c6273' }}>Path taken</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {summary.pathTitles.map((title, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>{title}</span>
              {i < summary.pathTitles.length - 1 && <ArrowRight size={12} style={{ color: '#5c6273' }} />}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] font-mono tracking-widest uppercase" style={{ color: '#5c6273' }}>Decisions</p>
        {summary.decisions.length === 0 ? (
          <p className="text-sm font-mono" style={{ color: '#5c6273' }}>No choice points were reached.</p>
        ) : (
          <div className="space-y-2.5">
            {summary.decisions.map((d, i) => (
              <div key={i} className="px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-sm mb-1">
                  At <span style={{ color: '#c9cdda' }}>"{d.nodeTitle}"</span> the host chose{' '}
                  <span className="font-medium" style={{ color: 'oklch(82% 0.18 165)' }}>"{d.choiceLabel}"</span>
                </p>
                <p className="text-[11px] font-mono" style={{ color: '#5c6273' }}>
                  {d.totalVotes > 0
                    ? `${Math.round(((d.voteCounts[d.choiceId] ?? 0) / d.totalVotes) * 100)}% of ${d.totalVotes} votes agreed`
                    : 'No votes were cast'}
                  {' · '}
                  {d.followedMajority ? 'matched the majority' : 'overrode the majority'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={copyText}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono transition-colors hover:bg-white/5"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#c9cdda' }}
        >
          {copied ? <Check size={13} /> : <ClipboardCopy size={13} />}
          {copied ? 'Copied' : 'Copy summary'}
        </button>
        <button
          onClick={downloadCsv}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono transition-colors hover:bg-white/5"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#c9cdda' }}
        >
          <Download size={13} />
          Export CSV
        </button>
        <Link
          href={`/dashboard/scenario/${scenario.id}/facilitate`}
          className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono transition-colors hover:bg-white/5"
          style={{ color: '#5c6273' }}
        >
          All sessions
          <ExternalLink size={12} />
        </Link>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-2xl font-mono font-semibold" style={{ color: '#e7e9f0' }}>{value}</p>
      <p className="text-[10px] font-mono uppercase tracking-wider mt-1" style={{ color: '#5c6273' }}>{label}</p>
    </div>
  )
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}
