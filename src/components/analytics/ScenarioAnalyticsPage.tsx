'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Copy, Check, BarChart3 } from 'lucide-react'
import { getScenarioAnalytics } from '@/lib/analytics/read'
import type { ScenarioAnalytics } from '@/types/analytics'

interface Props {
  scenarioId: string
}

export function ScenarioAnalyticsPage({ scenarioId }: Props) {
  const [data, setData] = useState<ScenarioAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getScenarioAnalytics(scenarioId)
      .then(setData)
      .catch(e => setError(e?.message ?? 'Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [scenarioId])

  if (loading) return <LoadingState />
  if (error || !data) return <ErrorState message={error ?? 'Unknown error'} />

  const { scenario, publishedVersion, summary, funnel, choices, endings, dropOffs, recentSessions } = data
  const playUrl = publishedVersion ? `${typeof window !== 'undefined' ? window.location.origin : ''}/play/${publishedVersion.slug}` : null
  const hasData = summary.totalPlays > 0

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-0)', color: 'var(--fg-0)' }}>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/dashboard"
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-[var(--tint-2)]"
              style={{ color: 'var(--fg-3)' }}
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] font-mono tracking-widest uppercase mb-1" style={{ color: 'var(--fg-4)' }}>
                Analytics
              </p>
              <h1 className="text-xl font-semibold truncate" style={{ color: 'var(--fg-0)' }}>
                {scenario.title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {publishedVersion && (
              <>
                <PublishedStatusBadge />
                {playUrl && <CopyLinkButton url={playUrl} />}
                <Link
                  href={`/play/${publishedVersion.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors hover:bg-[var(--tint-2)]"
                  style={{ color: 'var(--fg-2)', border: '1px solid var(--line-2)' }}
                >
                  <ExternalLink size={11} />
                  Open
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Not published */}
        {!publishedVersion && (
          <EmptyCard
            title="Analytics are available after publishing"
            description="Publish this scenario to start collecting player data."
            action={
              <Link
                href={`/editor/${scenarioId}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono transition-colors"
                style={{ background: 'var(--tint-2)', color: 'var(--fg-1)', border: '1px solid var(--line-2)' }}
              >
                Back to editor
              </Link>
            }
          />
        )}

        {/* Published but no data */}
        {publishedVersion && !hasData && playUrl && (
          <EmptyCard
            title="No player data yet"
            description="Share your published scenario link to start collecting analytics."
            action={
              <div className="flex items-center gap-2">
                <CopyLinkButton url={playUrl} label="Copy link" />
                <Link
                  href={`/play/${publishedVersion.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono transition-colors"
                  style={{ background: 'oklch(82% 0.18 165 / 0.10)', color: 'oklch(82% 0.18 165)', border: '1px solid oklch(82% 0.18 165 / 0.3)' }}
                >
                  <ExternalLink size={11} />
                  Open player
                </Link>
              </div>
            }
          />
        )}

        {publishedVersion && hasData && (
          <>
            {/* Summary cards */}
            <section>
              <SectionLabel>Overview</SectionLabel>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Total plays" value={summary.totalPlays.toString()} />
                <StatCard
                  label="Completion rate"
                  value={summary.totalPlays > 0 ? formatPercent(summary.completionRate * 100) : '—'}
                />
                <StatCard
                  label="Avg. completion time"
                  value={summary.averageCompletionSeconds != null ? formatDuration(summary.averageCompletionSeconds) : '—'}
                />
                <StatCard
                  label="Most reached ending"
                  value={summary.mostReachedEnding?.title ?? '—'}
                  small={summary.mostReachedEnding ? `${summary.mostReachedEnding.count} times` : undefined}
                />
              </div>
            </section>

            {/* Funnel */}
            <section>
              <SectionLabel>Player funnel</SectionLabel>
              <Card>
                <div className="flex items-center gap-0">
                  <FunnelStep label="Started" value={funnel.started} total={funnel.started} first />
                  <FunnelArrow />
                  <FunnelStep label="Made first choice" value={funnel.firstChoice} total={funnel.started} />
                  <FunnelArrow />
                  <FunnelStep label="Completed" value={funnel.completed} total={funnel.started} accent />
                </div>
              </Card>
            </section>

            {/* Choice breakdown */}
            {choices.length > 0 && (
              <section>
                <SectionLabel>Choice breakdown</SectionLabel>
                <p className="text-xs mb-3" style={{ color: 'var(--fg-4)' }}>
                  See which decisions players actually made.
                </p>
                <div className="space-y-3">
                  {choices.map(node => (
                    <Card key={node.nodeId}>
                      <p className="text-xs font-medium mb-3" style={{ color: 'var(--fg-1)' }}>
                        {node.nodeTitle}
                        <span className="ml-2 font-mono text-[10px]" style={{ color: 'var(--fg-4)' }}>
                          {node.totalSelections} selections
                        </span>
                      </p>
                      <div className="space-y-2">
                        {node.choices.map(c => (
                          <div key={c.choiceId}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs" style={{ color: 'var(--fg-2)' }}>{c.label}</span>
                              <span className="text-[10px] font-mono" style={{ color: 'var(--fg-4)' }}>
                                {c.count} &middot; {formatPercent(c.percentage)}
                              </span>
                            </div>
                            <ProgressBar percent={c.percentage} />
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Ending distribution */}
            {endings.length > 0 && (
              <section>
                <SectionLabel>Ending distribution</SectionLabel>
                <p className="text-xs mb-3" style={{ color: 'var(--fg-4)' }}>
                  See which outcomes players reached.
                </p>
                <Card>
                  <div className="space-y-2">
                    {endings.map(e => (
                      <div key={e.nodeId}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs" style={{ color: 'var(--fg-2)' }}>{e.title}</span>
                          <span className="text-[10px] font-mono" style={{ color: 'var(--fg-4)' }}>
                            {e.count} &middot; {formatPercent(e.percentage)}
                          </span>
                        </div>
                        <ProgressBar percent={e.percentage} accent />
                      </div>
                    ))}
                  </div>
                </Card>
              </section>
            )}

            {/* Drop-offs */}
            {dropOffs.length > 0 && (
              <section>
                <SectionLabel>Drop-off points</SectionLabel>
                <p className="text-xs mb-3" style={{ color: 'var(--fg-4)' }}>
                  Where sessions stopped before reaching an ending.
                </p>
                <Card>
                  <div className="space-y-2">
                    {dropOffs.map(d => (
                      <div key={d.nodeId}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs" style={{ color: 'var(--fg-2)' }}>{d.title}</span>
                          <span className="text-[10px] font-mono" style={{ color: 'var(--fg-4)' }}>
                            {d.count} &middot; {formatPercent(d.percentage)}
                          </span>
                        </div>
                        <ProgressBar percent={d.percentage} warn />
                      </div>
                    ))}
                  </div>
                </Card>
              </section>
            )}

            {/* Recent sessions */}
            {recentSessions.length > 0 && (
              <section>
                <SectionLabel>Recent sessions</SectionLabel>
                <p className="text-xs mb-3" style={{ color: 'var(--fg-4)' }}>
                  Anonymous playthroughs from the published scenario.
                </p>
                <Card noPad>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--line-1)' }}>
                          {['Started', 'Status', 'Ending', 'Duration', 'Choices'].map(h => (
                            <th
                              key={h}
                              className="px-4 py-2.5 text-left font-mono text-[10px] tracking-wider"
                              style={{ color: 'var(--fg-4)' }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recentSessions.map((s, i) => (
                          <tr
                            key={s.sessionId}
                            style={{ borderBottom: i < recentSessions.length - 1 ? '1px solid var(--line-1)' : 'none' }}
                          >
                            <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--fg-3)' }}>
                              {formatRelativeDate(s.startedAt)}
                            </td>
                            <td className="px-4 py-2.5">
                              {s.completed ? (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono" style={{ background: 'oklch(82% 0.18 165 / 0.12)', color: 'oklch(82% 0.18 165)' }}>
                                  Completed
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono" style={{ background: 'var(--tint-2)', color: 'var(--fg-4)' }}>
                                  Dropped
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5" style={{ color: 'var(--fg-2)' }}>
                              {s.endingTitle ?? '—'}
                            </td>
                            <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--fg-3)' }}>
                              {s.durationSeconds != null ? formatDuration(s.durationSeconds) : '—'}
                            </td>
                            <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--fg-3)' }}>
                              {s.choiceCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Card({ children, noPad = false }: { children: React.ReactNode; noPad?: boolean }) {
  return (
    <div
      className={noPad ? 'rounded-2xl overflow-hidden' : 'rounded-2xl p-4'}
      style={{ background: 'var(--bg-1)', border: '1px solid var(--line-1)' }}
    >
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-mono tracking-widest uppercase mb-3" style={{ color: 'var(--fg-4)' }}>
      {children}
    </p>
  )
}

function StatCard({ label, value, small }: { label: string; value: string; small?: string }) {
  return (
    <Card>
      <p className="text-[10px] font-mono mb-2" style={{ color: 'var(--fg-4)' }}>{label}</p>
      <p className="text-2xl font-semibold tracking-tight truncate" style={{ color: 'var(--fg-0)' }}>{value}</p>
      {small && <p className="text-[10px] font-mono mt-1 truncate" style={{ color: 'var(--fg-4)' }}>{small}</p>}
    </Card>
  )
}

function ProgressBar({ percent, accent = false, warn = false }: { percent: number; accent?: boolean; warn?: boolean }) {
  const color = warn
    ? 'oklch(75% 0.16 35)'
    : accent
    ? 'oklch(82% 0.18 165)'
    : 'oklch(65% 0.14 260)'
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--tint-2)' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, percent))}%`, background: color }}
      />
    </div>
  )
}

function FunnelStep({
  label, value, total, first = false, accent = false,
}: {
  label: string
  value: number
  total: number
  first?: boolean
  accent?: boolean
}) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="flex-1 text-center px-4 py-3">
      <p
        className="text-2xl font-semibold mb-1"
        style={{ color: accent ? 'oklch(82% 0.18 165)' : 'var(--fg-0)' }}
      >
        {value}
      </p>
      <p className="text-[10px] font-mono mb-1" style={{ color: 'var(--fg-4)' }}>{label}</p>
      {!first && (
        <p className="text-[10px] font-mono" style={{ color: 'var(--fg-4)' }}>
          {total > 0 ? formatPercent(pct) : '—'}
        </p>
      )}
    </div>
  )
}

function FunnelArrow() {
  return (
    <div className="shrink-0 flex items-center" style={{ color: 'var(--fg-4)' }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M3 8h8M8 5l3 3-3 3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function PublishedStatusBadge() {
  return (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-mono"
      style={{ background: 'oklch(82% 0.18 165 / 0.1)', border: '1px solid oklch(82% 0.18 165 / 0.3)', color: 'oklch(82% 0.18 165)' }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'oklch(82% 0.18 165)' }} />
      Published
    </div>
  )
}

function CopyLinkButton({ url, label = 'Copy link' }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [url])

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors hover:bg-[var(--tint-2)]"
      style={{ color: 'var(--fg-2)', border: '1px solid var(--line-2)' }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied!' : label}
    </button>
  )
}

function EmptyCard({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-10 text-center"
      style={{ background: 'var(--bg-1)', border: '1px solid var(--line-1)' }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4"
        style={{ background: 'var(--tint-2)', color: 'var(--fg-4)' }}
      >
        <BarChart3 size={18} />
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--fg-1)' }}>{title}</p>
      <p className="text-xs mb-4 max-w-xs mx-auto" style={{ color: 'var(--fg-4)' }}>{description}</p>
      {action}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-0)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--line-2)', borderTopColor: 'oklch(82% 0.18 165)' }} />
        <p className="text-xs font-mono" style={{ color: 'var(--fg-4)' }}>Loading analytics…</p>
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-0)' }}>
      <div className="text-center">
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--fg-1)' }}>Failed to load analytics</p>
        <p className="text-xs font-mono mb-4" style={{ color: 'var(--fg-4)' }}>{message}</p>
        <Link
          href="/dashboard"
          className="text-xs font-mono"
          style={{ color: 'oklch(82% 0.18 165)' }}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatPercent(n: number): string {
  if (!isFinite(n)) return '—'
  return `${Math.round(n)}%`
}

function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function formatRelativeDate(iso: string): string {
  try {
    const d = new Date(iso)
    const now = Date.now()
    const diff = now - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}
