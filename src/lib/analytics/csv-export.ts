import { getSupabaseClient } from '@/lib/supabase/client'
import type { ScenarioAnalytics } from '@/types/analytics'

function escapeCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function buildCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.map(escapeCell).join(',')]
  for (const row of rows) lines.push(row.map(escapeCell).join(','))
  return lines.join('\r\n')
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportSessionsCsv(data: ScenarioAnalytics): void {
  const headers = ['Session ID', 'Started At', 'Completed', 'Ending Node ID', 'Ending Title', 'Duration (s)', 'Choices Made']
  const rows = data.recentSessions.map(s => [
    s.sessionId,
    s.startedAt,
    s.completed ? 'yes' : 'no',
    s.endingNodeId ?? '',
    s.endingTitle ?? '',
    s.durationSeconds != null ? String(Math.round(s.durationSeconds)) : '',
    String(s.choiceCount),
  ])
  const slug = data.publishedVersion?.slug ?? data.scenario.id
  downloadCsv(`${slug}-sessions.csv`, buildCsv(headers, rows))
}

interface RawEvent {
  id: string
  session_id: string
  scenario_id: string
  event_type: string
  node_id: string | null
  choice_id: string | null
  target_node_id: string | null
  ending_node_id: string | null
  score: Record<string, number> | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export async function exportEventsCsv(scenarioId: string, scenarioSlug?: string): Promise<void> {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('player_events')
    .select('*')
    .eq('scenario_id', scenarioId)
    .order('created_at', { ascending: true })
    .limit(10000)

  if (error) throw new Error(error.message)

  const events = (data ?? []) as unknown as RawEvent[]
  const headers = [
    'Event ID', 'Session ID', 'Event Type', 'Node ID', 'Choice ID',
    'Target Node ID', 'Ending Node ID', 'Score JSON', 'Metadata JSON', 'Created At',
  ]
  const rows = events.map(e => [
    e.id,
    e.session_id,
    e.event_type,
    e.node_id ?? '',
    e.choice_id ?? '',
    e.target_node_id ?? '',
    e.ending_node_id ?? '',
    e.score ? JSON.stringify(e.score) : '',
    e.metadata ? JSON.stringify(e.metadata) : '',
    e.created_at,
  ])
  const slug = scenarioSlug ?? scenarioId
  downloadCsv(`${slug}-events.csv`, buildCsv(headers, rows))
}
