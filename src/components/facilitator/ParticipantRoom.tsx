'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Loader2, Users, Check, Vote, Eye, MessageCircle, Hourglass, Square, ArrowRight } from 'lucide-react'
import { getNodeById, isEndingNode } from '@/lib/scenario-engine'
import {
  getFacilitatorSession,
  fetchScenarioVersion,
  subscribeToRoom,
  tallyVotes,
  majorityChoiceId,
  joinFacilitatorSession,
  castVote,
  fetchParticipants,
  fetchVotes,
  findOwnVote,
  getAnonymousId,
  normalizeJoinCode,
} from '@/lib/facilitator'
import { getScenarioById } from '@/lib/persistence/scenarios'
import { SceneMedia } from './SceneMedia'
import type { Scenario, ScenarioVersion, ScenarioNode } from '@/types'
import type { FacilitatorSession, FacilitatorParticipant, FacilitatorVote, FacilitatorVoteTally } from '@/types/facilitator'

interface Props {
  joinCode: string
}

type Stage = 'loading' | 'join-form' | 'in-room' | 'not-found' | 'ended-before-join'

export function ParticipantRoom({ joinCode }: Props) {
  const code = useMemo(() => normalizeJoinCode(joinCode), [joinCode])

  const [stage, setStage] = useState<Stage>('loading')
  const [error, setError] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [joining, setJoining] = useState(false)

  const [session, setSession] = useState<FacilitatorSession | null>(null)
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [version, setVersion] = useState<ScenarioVersion | null>(null)
  const [participant, setParticipant] = useState<FacilitatorParticipant | null>(null)
  const [participants, setParticipants] = useState<FacilitatorParticipant[]>([])
  const [votes, setVotes] = useState<FacilitatorVote[]>([])

  // Look up the session by join code first, so we know whether to show the
  // join form or a friendly "this session has ended" state up front.
  useEffect(() => {
    let cancelled = false
    if (!code) { setStage('not-found'); return }
    ;(async () => {
      try {
        const sb = (await import('@/lib/supabase/client')).getSupabaseClient()
        const { data } = await sb.from('facilitator_sessions').select('*').eq('join_code', code).maybeSingle()
        if (cancelled) return
        if (!data) { setStage('not-found'); return }
        if ((data as { status: string }).status === 'ended') { setStage('ended-before-join'); return }
        setStage('join-form')
      } catch {
        if (!cancelled) setStage('not-found')
      }
    })()
    return () => { cancelled = true }
  }, [code])

  const handleJoin = async () => {
    if (joining) return
    setJoining(true)
    setError(null)
    try {
      const result = await joinFacilitatorSession({ joinCode: code, displayName: displayName.trim() || undefined })
      if (!result.ok || !result.participant || !result.session) {
        setError(result.error ?? 'Could not join this session')
        setJoining(false)
        return
      }
      setParticipant(result.participant)

      const s = await getFacilitatorSession(result.session.id)
      if (!s) { setError('Session not found'); setJoining(false); return }
      const [sc, ver, ps, vs] = await Promise.all([
        getScenarioById(s.scenarioId),
        fetchScenarioVersion(s.scenarioVersionId),
        fetchParticipants(s.id),
        fetchVotes(s.id),
      ])
      if (!sc || !ver) { setError('Scenario data unavailable'); setJoining(false); return }
      setSession(s)
      setScenario(sc)
      setVersion(ver)
      setParticipants(ps)
      setVotes(vs)
      setStage('in-room')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong joining')
    } finally {
      setJoining(false)
    }
  }

  // Realtime subscription once in the room
  useEffect(() => {
    if (stage !== 'in-room' || !session) return
    const unsubscribe = subscribeToRoom(session.id, {
      onSession: setSession,
      onParticipants: setParticipants,
      onVotes: setVotes,
    })
    return unsubscribe
  }, [stage, session?.id])

  if (stage === 'loading') {
    return <CenteredState><Loader2 size={20} className="animate-spin" style={{ color: '#5c6273' }} /></CenteredState>
  }

  if (stage === 'not-found') {
    return (
      <CenteredState>
        <p className="text-sm font-mono text-center px-6" style={{ color: '#c9cdda' }}>
          No session found for code <span style={{ color: 'oklch(82% 0.18 165)' }}>{code || '—'}</span>.
          <br />Double-check the code with your facilitator.
        </p>
      </CenteredState>
    )
  }

  if (stage === 'ended-before-join') {
    return (
      <CenteredState>
        <p className="text-sm font-mono text-center px-6" style={{ color: '#c9cdda' }}>
          This session has already ended.
        </p>
      </CenteredState>
    )
  }

  if (stage === 'join-form') {
    return (
      <CenteredState>
        <div className="w-full max-w-sm px-6 space-y-5">
          <div className="text-center space-y-1">
            <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: '#5c6273' }}>Joining session</p>
            <p className="text-2xl font-mono font-bold tracking-[0.25em]" style={{ color: 'oklch(82% 0.18 165)' }}>{code}</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-mono" style={{ color: '#8a90a4' }}>Your name (optional)</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleJoin() }}
              placeholder="e.g. Jamie"
              maxLength={64}
              className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e7e9f0' }}
            />
          </div>
          {error && <p className="text-xs font-mono" style={{ color: 'oklch(70% 0.18 25)' }}>{error}</p>}
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-xl text-sm font-mono font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: 'oklch(82% 0.18 165)', color: '#0a0b10' }}
          >
            {joining ? <Loader2 size={16} className="animate-spin" /> : null}
            Join session
          </button>
          <p className="text-[10px] font-mono text-center" style={{ color: '#5c6273' }}>
            No account needed — you'll stay anonymous to other participants.
          </p>
        </div>
      </CenteredState>
    )
  }

  if (!session || !scenario || !version) return <CenteredState><Loader2 size={20} className="animate-spin" style={{ color: '#5c6273' }} /></CenteredState>

  return (
    <LiveParticipantView
      session={session}
      scenario={scenario}
      version={version}
      participant={participant}
      participants={participants}
      votes={votes}
    />
  )
}

function CenteredState({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0b10' }}>
      {children}
    </div>
  )
}

// ── Live participant view ─────────────────────────────────────────────────────

function LiveParticipantView({ session, scenario, version, participant, participants, votes }: {
  session: FacilitatorSession
  scenario: Scenario
  version: ScenarioVersion
  participant: FacilitatorParticipant | null
  participants: FacilitatorParticipant[]
  votes: FacilitatorVote[]
}) {
  const currentNode = useMemo<ScenarioNode | null>(
    () => session.currentNodeId ? getNodeById(version, session.currentNodeId) ?? null : null,
    [version, session.currentNodeId]
  )
  const { tallies, totalVotes } = useMemo(
    () => tallyVotes(version, session.currentNodeId, votes),
    [version, session.currentNodeId, votes]
  )
  const majority = useMemo(() => majorityChoiceId(tallies), [tallies])
  const myVote = useMemo(
    () => currentNode ? findOwnVote(votes, participant, currentNode.id) : undefined,
    [votes, participant, currentNode]
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0b10', color: '#e7e9f0' }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="min-w-0">
          <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: '#5c6273' }}>{scenario.title}</p>
          <p className="text-xs font-mono mt-0.5" style={{ color: '#8a90a4' }}>Code {session.joinCode}</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono shrink-0" style={{ background: 'rgba(255,255,255,0.04)', color: '#c9cdda' }}>
          <Users size={12} />
          {participants.length}
        </div>
      </div>

      <div className="flex-1 flex flex-col px-5 py-5 gap-5 max-w-md mx-auto w-full">
        {session.status === 'waiting' && (
          <CenteredMessage icon={<Hourglass size={20} />} title="Waiting for the host to start" subtitle="You're in! The session will begin shortly." />
        )}

        {session.status === 'live' && currentNode && (
          <>
            <SceneMedia node={currentNode} aspectRatio="16/9" />

            {isEndingNode(version, currentNode.id) ? (
              <CenteredMessage icon={<Square size={20} />} title="The story has reached its ending" subtitle={`"${currentNode.title}" — wait for the facilitator to wrap up.`} />
            ) : session.phase === 'showing_scene' ? (
              <CenteredMessage icon={<Eye size={20} />} title="Watch the scene" subtitle="Voting will open once everyone has seen this." />
            ) : session.phase === 'voting_open' ? (
              <VotingPanel
                node={currentNode}
                sessionId={session.id}
                myVote={myVote}
              />
            ) : session.phase === 'results_revealed' || session.phase === 'discussing' ? (
              <ResultsPanel tallies={tallies} totalVotes={totalVotes} majority={majority} myVote={myVote} discussing={session.phase === 'discussing'} />
            ) : null}
          </>
        )}

        {session.status === 'live' && !currentNode && (
          <CenteredMessage icon={<Hourglass size={20} />} title="Hold tight" subtitle="The facilitator is moving to the next scene." />
        )}

        {session.status === 'ended' && (
          <CenteredMessage icon={<Check size={20} />} title="Session complete" subtitle="Thanks for playing! The facilitator may share a summary with the group." />
        )}
      </div>
    </div>
  )
}

function CenteredMessage({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-10">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', color: 'oklch(82% 0.18 165)' }}>
        {icon}
      </div>
      <p className="text-base font-medium">{title}</p>
      <p className="text-xs font-mono max-w-xs" style={{ color: '#5c6273' }}>{subtitle}</p>
    </div>
  )
}

function VotingPanel({ node, sessionId, myVote }: {
  node: ScenarioNode
  sessionId: string
  myVote: FacilitatorVote | undefined
}) {
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [localChoiceId, setLocalChoiceId] = useState<string | null>(myVote?.choiceId ?? null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { if (myVote) setLocalChoiceId(myVote.choiceId) }, [myVote?.choiceId])

  const vote = async (choiceId: string) => {
    if (submitting) return
    setSubmitting(choiceId)
    setError(null)
    const result = await castVote({ sessionId, nodeId: node.id, choiceId })
    if (!result.ok) {
      setError(result.error ?? 'Could not submit your vote')
    } else {
      setLocalChoiceId(choiceId)
    }
    setSubmitting(null)
  }

  if (localChoiceId) {
    const chosen = node.choices.find(c => c.id === localChoiceId)
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-10">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'oklch(82% 0.18 165 / 0.12)', color: 'oklch(82% 0.18 165)' }}>
          <Check size={20} />
        </div>
        <p className="text-base font-medium">Your vote was submitted</p>
        {chosen && <p className="text-xs font-mono" style={{ color: '#8a90a4' }}>You picked "{chosen.label}"</p>}
        <p className="text-xs font-mono" style={{ color: '#5c6273' }}>Waiting for the facilitator to reveal the results…</p>
        <button
          onClick={() => setLocalChoiceId(null)}
          className="text-[11px] font-mono underline underline-offset-4 mt-2"
          style={{ color: '#5c6273' }}
        >
          Change my vote
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest uppercase" style={{ color: '#5c6273' }}>
        <Vote size={13} />
        Cast your vote
      </div>
      {error && <p className="text-xs font-mono" style={{ color: 'oklch(70% 0.18 25)' }}>{error}</p>}
      <div className="space-y-2.5">
        {node.choices.map(c => (
          <button
            key={c.id}
            onClick={() => void vote(c.id)}
            disabled={submitting !== null}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl text-sm text-left transition-opacity disabled:opacity-60"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e7e9f0' }}
          >
            {c.label}
            {submitting === c.id ? <Loader2 size={15} className="animate-spin" style={{ color: 'oklch(82% 0.18 165)' }} /> : <ArrowRight size={15} style={{ color: '#5c6273' }} />}
          </button>
        ))}
      </div>
    </div>
  )
}

function ResultsPanel({ tallies, totalVotes, majority, myVote, discussing }: {
  tallies: FacilitatorVoteTally[]
  totalVotes: number
  majority: string | null
  myVote: FacilitatorVote | undefined
  discussing: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest uppercase" style={{ color: '#5c6273' }}>
        {discussing ? <MessageCircle size={13} /> : <Eye size={13} />}
        {discussing ? 'Discussing as a group' : 'Results'}
      </div>
      <p className="text-xs font-mono" style={{ color: '#8a90a4' }}>
        {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} total
      </p>
      <div className="space-y-2.5">
        {tallies.map(t => (
          <div key={t.choiceId}>
            <div className="flex items-center justify-between mb-1 text-xs font-mono">
              <span className="flex items-center gap-1.5" style={{ color: t.choiceId === majority ? 'oklch(82% 0.18 165)' : '#c9cdda' }}>
                {t.label}
                {myVote?.choiceId === t.choiceId && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#8a90a4' }}>your vote</span>
                )}
              </span>
              <span style={{ color: '#5c6273' }}>{t.count} · {Math.round(t.percentage)}%</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${t.percentage}%` }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ background: t.choiceId === majority ? 'oklch(82% 0.18 165)' : '#5c6273' }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] font-mono text-center mt-2" style={{ color: '#5c6273' }}>
        The facilitator decides the path forward — the vote is shown for context.
      </p>
    </div>
  )
}
