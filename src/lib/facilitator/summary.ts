// Builds the deterministic end-of-session summary — entirely derived from the
// session's own decision_log / visited_node_ids / participant & vote counts.
// No AI, no fabricated data (per spec Step 10).

import { getNodeById, isEndingNode } from '@/lib/scenario-engine'
import type { Scenario, ScenarioVersion } from '@/types'
import type { FacilitatorSession, FacilitatorSessionSummary } from '@/types/facilitator'

export function buildSessionSummary(
  session: FacilitatorSession,
  scenario: Scenario,
  version: ScenarioVersion,
  participantCount: number,
  totalVotes: number
): FacilitatorSessionSummary {
  const pathTitles = session.visitedNodeIds.map(id => getNodeById(version, id)?.title ?? id)

  const lastNodeId = session.visitedNodeIds[session.visitedNodeIds.length - 1] ?? null
  const endingNodeId = lastNodeId && isEndingNode(version, lastNodeId) ? lastNodeId : null
  const endingTitle = endingNodeId ? (getNodeById(version, endingNodeId)?.title ?? endingNodeId) : null

  let durationSeconds: number | null = null
  if (session.startedAt && session.endedAt) {
    const dur = (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000
    if (dur > 0) durationSeconds = Math.round(dur)
  }

  return {
    session,
    scenario,
    participantCount,
    totalVotes,
    decisions: session.decisionLog,
    pathTitles,
    durationSeconds,
    endingNodeId,
    endingTitle,
  }
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

/** Plain-text summary for the "Copy summary" button. */
export function summaryToText(summary: FacilitatorSessionSummary): string {
  const lines: string[] = []
  lines.push(`${summary.scenario.title} — Facilitator session summary`)
  lines.push(`Join code: ${summary.session.joinCode}`)
  lines.push(`Participants: ${summary.participantCount}`)
  lines.push(`Total votes cast: ${summary.totalVotes}`)
  lines.push(`Duration: ${formatDuration(summary.durationSeconds)}`)
  if (summary.endingTitle) lines.push(`Ending reached: ${summary.endingTitle}`)
  lines.push('')
  lines.push('Path taken:')
  lines.push(summary.pathTitles.map((t, i) => `${i + 1}. ${t}`).join('\n'))
  lines.push('')
  lines.push('Decisions:')
  if (summary.decisions.length === 0) {
    lines.push('(no choice points reached)')
  } else {
    for (const d of summary.decisions) {
      const total = d.totalVotes
      const pct = total > 0 ? Math.round(((d.voteCounts[d.choiceId] ?? 0) / total) * 100) : 0
      lines.push(
        `• At "${d.nodeTitle}": host chose "${d.choiceLabel}"` +
        (total > 0 ? ` (${pct}% of ${total} votes agreed)` : ' (no votes cast)') +
        (d.followedMajority ? ' — matched the majority' : ' — overrode the majority')
      )
    }
  }
  return lines.join('\n')
}

interface CsvRow { label: string; value: string }

function escapeCell(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) return `"${v.replace(/"/g, '""')}"`
  return v
}

/** CSV export — one row per decision, plus a header block of session-level stats. */
export function summaryToCsv(summary: FacilitatorSessionSummary): string {
  const header: CsvRow[] = [
    { label: 'Scenario', value: summary.scenario.title },
    { label: 'Join Code', value: summary.session.joinCode },
    { label: 'Participants', value: String(summary.participantCount) },
    { label: 'Total Votes', value: String(summary.totalVotes) },
    { label: 'Duration (s)', value: summary.durationSeconds != null ? String(summary.durationSeconds) : '' },
    { label: 'Ending Reached', value: summary.endingTitle ?? '' },
  ]

  const lines: string[] = []
  for (const row of header) lines.push([escapeCell(row.label), escapeCell(row.value)].join(','))
  lines.push('')
  lines.push(['Step', 'Node', 'Host Choice', 'Followed Majority', 'Total Votes', 'Vote Breakdown'].map(escapeCell).join(','))
  summary.decisions.forEach((d, i) => {
    const breakdown = Object.entries(d.voteCounts).map(([choiceId, count]) => `${choiceId}:${count}`).join(' | ')
    lines.push([
      String(i + 1),
      d.nodeTitle,
      d.choiceLabel,
      d.followedMajority ? 'yes' : 'no',
      String(d.totalVotes),
      breakdown,
    ].map(escapeCell).join(','))
  })
  return lines.join('\r\n')
}
