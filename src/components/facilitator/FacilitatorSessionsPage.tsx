'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Radio, Loader2, ExternalLink, Clock } from 'lucide-react'
import { getScenarioById } from '@/lib/persistence/scenarios'
import { createFacilitatorSession, listFacilitatorSessions } from '@/lib/facilitator'
import type { Scenario } from '@/types'
import type { FacilitatorSession, FacilitatorSessionStatus } from '@/types/facilitator'

interface Props {
  scenarioId: string
}

const STATUS_LABEL: Record<FacilitatorSessionStatus, { label: string; color: string; bg: string; border: string }> = {
  waiting: { label: 'Waiting to start', color: 'var(--fg-2)', bg: 'var(--tint-1)', border: 'var(--line-2)' },
  live: { label: 'Live', color: 'oklch(82% 0.18 165)', bg: 'oklch(82% 0.18 165 / 0.1)', border: 'oklch(82% 0.18 165 / 0.3)' },
  ended: { label: 'Ended', color: 'var(--fg-3)', bg: 'var(--tint-1)', border: 'var(--line-2)' },
}

export function FacilitatorSessionsPage({ scenarioId }: Props) {
  const router = useRouter()
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [sessions, setSessions] = useState<FacilitatorSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  const load = useCallback(async () => {
    try {
      const [s, list] = await Promise.all([
        getScenarioById(scenarioId),
        listFacilitatorSessions(scenarioId),
      ])
      setScenario(s)
      setSessions(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [scenarioId])

  useEffect(() => { void load() }, [load])

  const startNewSession = async () => {
    if (!scenario?.publishedVersion || starting) return
    setStarting(true)
    try {
      const session = await createFacilitatorSession(scenario, scenario.publishedVersion)
      router.push(`/facilitate/${session.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start session')
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-0)' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--fg-3)' }} />
      </div>
    )
  }

  if (error || !scenario) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: 'var(--bg-0)' }}>
        <p className="text-sm font-mono" style={{ color: 'var(--fg-3)' }}>{error ?? 'Scenario not found'}</p>
        <Link href="/dashboard" className="text-xs font-mono underline" style={{ color: 'var(--fg-3)' }}>Back to dashboard</Link>
      </div>
    )
  }

  const pub = scenario.publishedVersion

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-0)', color: 'var(--fg-0)' }}>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-[var(--tint-2)]"
            style={{ color: 'var(--fg-3)' }}
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] font-mono tracking-widest uppercase mb-1" style={{ color: 'var(--fg-4)' }}>
              Facilitator Sessions
            </p>
            <h1 className="text-xl font-semibold truncate" style={{ color: 'var(--fg-0)' }}>
              {scenario.title}
            </h1>
          </div>

          {pub && (
            <button
              onClick={startNewSession}
              disabled={starting}
              className="ml-auto shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: 'var(--neon-mint)', color: 'var(--bg-0)' }}
            >
              {starting ? <Loader2 size={13} className="animate-spin" /> : <Radio size={13} />}
              {starting ? 'Starting…' : 'Start new session'}
            </button>
          )}
        </div>

        {!pub && (
          <div className="rounded-2xl p-5 text-sm font-mono" style={{ background: 'var(--bg-1)', border: '1px solid var(--line-2)', color: 'var(--fg-3)' }}>
            Publish this scenario before starting a facilitator session — live sessions run from the published version.
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--bg-1)', border: '1px dashed var(--line-2)' }}>
            <Radio size={22} className="mx-auto mb-3" style={{ color: 'var(--fg-4)' }} />
            <p className="text-sm font-mono" style={{ color: 'var(--fg-3)' }}>No facilitator sessions yet</p>
            <p className="text-xs font-mono mt-1" style={{ color: 'var(--fg-4)' }}>
              Start one to run this scenario live with a group, gathering votes as you go.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(session => {
              const cfg = STATUS_LABEL[session.status]
              const created = new Date(session.createdAt).toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
              })
              return (
                <Link
                  key={session.id}
                  href={`/facilitate/${session.id}`}
                  className="flex items-center gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-[var(--tint-1)]"
                  style={{ background: 'var(--bg-1)', border: '1px solid var(--line-2)' }}
                >
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono shrink-0"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                    {cfg.label}
                  </div>
                  <span className="text-sm font-mono tracking-wider" style={{ color: 'var(--fg-0)' }}>
                    {session.joinCode}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] font-mono ml-auto" style={{ color: 'var(--fg-4)' }}>
                    <Clock size={10} />
                    {created}
                  </span>
                  <ExternalLink size={13} style={{ color: 'var(--fg-4)' }} />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
