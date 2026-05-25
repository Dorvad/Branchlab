import { getSupabaseClient } from '@/lib/supabase/client'
import type { Scenario, ScenarioVersion, ScenarioNode } from '@/types'
import type { ScenarioAnalytics } from '@/types/analytics'

function sb() {
  return getSupabaseClient()
}

export async function getScenarioAnalytics(scenarioId: string): Promise<ScenarioAnalytics> {
  // Load scenario (owner-only via RLS)
  const { data: scenarioRow, error: scenarioErr } = await sb()
    .from('scenarios')
    .select('*')
    .eq('id', scenarioId)
    .single()

  if (scenarioErr || !scenarioRow) throw new Error('Scenario not found or not authorized')

  const scenario = rowToScenario(scenarioRow)

  // Load latest published version for this scenario
  const { data: versionRow } = await sb()
    .from('scenario_versions')
    .select('*')
    .eq('scenario_id', scenarioId)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const publishedVersion = versionRow ? rowToVersion(versionRow) : null

  if (!publishedVersion) {
    return emptyAnalytics(scenario, null)
  }

  // Load sessions for this scenario
  const { data: sessionRows } = await sb()
    .from('player_sessions')
    .select('*')
    .eq('scenario_id', scenarioId)
    .order('started_at', { ascending: false })
    .limit(500)

  const sessions = (sessionRows ?? []) as unknown as RawSession[]

  if (sessions.length === 0) {
    return emptyAnalytics(scenario, publishedVersion)
  }

  const sessionIds = sessions.map(s => s.id)

  // Load events for these sessions
  const { data: eventRows } = await sb()
    .from('player_events')
    .select('*')
    .in('session_id', sessionIds)

  const events = (eventRows ?? []) as unknown as RawEvent[]

  return aggregateAnalytics(scenario, publishedVersion, sessions, events)
}

// ── Aggregation ───────────────────────────────────────────────────────────────

function aggregateAnalytics(
  scenario: Scenario,
  publishedVersion: ScenarioVersion,
  sessions: RawSession[],
  events: RawEvent[],
): ScenarioAnalytics {
  const nodes = publishedVersion.nodes
  const nodeMap = new Map<string, ScenarioNode>(nodes.map(n => [n.id, n]))

  const totalPlays = sessions.length

  // Group events by session
  const eventsBySession = new Map<string, RawEvent[]>()
  for (const e of events) {
    const arr = eventsBySession.get(e.session_id) ?? []
    arr.push(e)
    eventsBySession.set(e.session_id, arr)
  }

  // Completed sessions = sessions that have a 'session_completed' event
  const completedSessionIds = new Set(
    events.filter(e => e.event_type === 'session_completed').map(e => e.session_id)
  )
  const completedSessions = completedSessionIds.size
  const completionRate = totalPlays > 0 ? completedSessions / totalPlays : 0

  // Average completion time (seconds between session_started and session_completed)
  const completionTimes: number[] = []
  for (const sessionId of completedSessionIds) {
    const ses = sessions.find(s => s.id === sessionId)
    const sesEvents = eventsBySession.get(sessionId) ?? []
    const startEvt = sesEvents.find(e => e.event_type === 'session_started')
    const endEvt = sesEvents.find(e => e.event_type === 'session_completed')
    if (ses && startEvt && endEvt) {
      const durSec = (new Date(endEvt.created_at).getTime() - new Date(startEvt.created_at).getTime()) / 1000
      if (durSec > 0) completionTimes.push(durSec)
    } else if (ses) {
      const startTime = new Date(ses.started_at).getTime()
      const endTime = endEvt ? new Date(endEvt.created_at).getTime() : null
      if (endTime) {
        const durSec = (endTime - startTime) / 1000
        if (durSec > 0) completionTimes.push(durSec)
      }
    }
  }
  const averageCompletionSeconds = completionTimes.length > 0
    ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
    : null

  // Funnel
  const firstChoiceSessionIds = new Set(
    events.filter(e => e.event_type === 'choice_selected').map(e => e.session_id)
  )
  const funnel = {
    started: totalPlays,
    firstChoice: firstChoiceSessionIds.size,
    completed: completedSessions,
  }

  // Ending counts
  const endingEventCounts = new Map<string, number>()
  for (const e of events) {
    if (e.event_type === 'ending_reached' && e.ending_node_id) {
      endingEventCounts.set(e.ending_node_id, (endingEventCounts.get(e.ending_node_id) ?? 0) + 1)
    }
  }
  const totalEndingReached = [...endingEventCounts.values()].reduce((a, b) => a + b, 0)
  const endings = [...endingEventCounts.entries()]
    .map(([nodeId, count]) => ({
      nodeId,
      title: nodeMap.get(nodeId)?.title ?? nodeId,
      count,
      percentage: totalEndingReached > 0 ? (count / totalEndingReached) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)

  const mostReachedEnding = endings[0]
    ? { nodeId: endings[0].nodeId, title: endings[0].title, count: endings[0].count }
    : null

  // Choice breakdown — per node
  const choiceSelections = events.filter(e => e.event_type === 'choice_selected')
  const choiceCountByNode = new Map<string, Map<string, number>>()
  for (const e of choiceSelections) {
    if (!e.node_id || !e.choice_id) continue
    const nodeChoices = choiceCountByNode.get(e.node_id) ?? new Map<string, number>()
    nodeChoices.set(e.choice_id, (nodeChoices.get(e.choice_id) ?? 0) + 1)
    choiceCountByNode.set(e.node_id, nodeChoices)
  }

  const choices = nodes
    .filter(n => n.choices.length > 0 && choiceCountByNode.has(n.id))
    .map(n => {
      const nodeChoices = choiceCountByNode.get(n.id)!
      const totalSelections = [...nodeChoices.values()].reduce((a, b) => a + b, 0)
      return {
        nodeId: n.id,
        nodeTitle: n.title,
        totalSelections,
        choices: n.choices.map(c => {
          const count = nodeChoices.get(c.id) ?? 0
          return {
            choiceId: c.id,
            label: c.label,
            targetNodeId: c.targetNodeId,
            count,
            percentage: totalSelections > 0 ? (count / totalSelections) * 100 : 0,
          }
        }).sort((a, b) => b.count - a.count),
      }
    })
    .sort((a, b) => b.totalSelections - a.totalSelections)

  // Drop-offs: sessions that viewed a node but never completed, grouped by last node viewed
  const dropOffCounts = new Map<string, number>()
  for (const session of sessions) {
    if (completedSessionIds.has(session.id)) continue
    const sesEvents = eventsBySession.get(session.id) ?? []
    const nodeViewedEvents = sesEvents.filter(e => e.event_type === 'node_viewed')
    if (nodeViewedEvents.length === 0) continue
    const lastViewed = nodeViewedEvents[nodeViewedEvents.length - 1]
    if (lastViewed.node_id) {
      dropOffCounts.set(lastViewed.node_id, (dropOffCounts.get(lastViewed.node_id) ?? 0) + 1)
    }
  }
  const totalDropOffs = [...dropOffCounts.values()].reduce((a, b) => a + b, 0)
  const dropOffs = [...dropOffCounts.entries()]
    .map(([nodeId, count]) => ({
      nodeId,
      title: nodeMap.get(nodeId)?.title ?? nodeId,
      count,
      percentage: totalDropOffs > 0 ? (count / totalDropOffs) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // Recent sessions table
  const recentSessions = sessions.slice(0, 50).map(session => {
    const sesEvents = eventsBySession.get(session.id) ?? []
    const completed = completedSessionIds.has(session.id)
    const endEvt = sesEvents.find(e => e.event_type === 'ending_reached')
    const endingNodeId = endEvt?.ending_node_id ?? undefined
    const endingTitle = endingNodeId ? (nodeMap.get(endingNodeId)?.title ?? undefined) : undefined
    const startEvt = sesEvents.find(e => e.event_type === 'session_started')
    const completedEvt = sesEvents.find(e => e.event_type === 'session_completed')
    let durationSeconds: number | undefined
    if (startEvt && completedEvt) {
      durationSeconds = (new Date(completedEvt.created_at).getTime() - new Date(startEvt.created_at).getTime()) / 1000
    } else if (completed) {
      durationSeconds = (new Date(session.started_at).getTime() - new Date(session.started_at).getTime()) / 1000
    }
    const choiceCount = sesEvents.filter(e => e.event_type === 'choice_selected').length
    return {
      sessionId: session.id,
      startedAt: session.started_at,
      completed,
      endingNodeId,
      endingTitle,
      durationSeconds: durationSeconds && durationSeconds > 0 ? durationSeconds : undefined,
      choiceCount,
    }
  })

  return {
    scenario,
    publishedVersion,
    summary: { totalPlays, completedSessions, completionRate, averageCompletionSeconds, mostReachedEnding },
    funnel,
    choices,
    endings,
    dropOffs,
    recentSessions,
  }
}

function emptyAnalytics(scenario: Scenario, publishedVersion: ScenarioVersion | null): ScenarioAnalytics {
  return {
    scenario,
    publishedVersion,
    summary: { totalPlays: 0, completedSessions: 0, completionRate: 0, averageCompletionSeconds: null, mostReachedEnding: null },
    funnel: { started: 0, firstChoice: 0, completed: 0 },
    choices: [],
    endings: [],
    dropOffs: [],
    recentSessions: [],
  }
}

// ── Row mappers ───────────────────────────────────────────────────────────────

interface RawSession {
  id: string
  scenario_version_id: string
  scenario_id: string
  slug: string
  visitor_id: string | null
  started_at: string
  user_agent: string | null
  referrer: string | null
  created_at: string
}

interface RawEvent {
  id: string
  session_id: string
  scenario_version_id: string
  scenario_id: string
  event_type: string
  node_id: string | null
  choice_id: string | null
  target_node_id: string | null
  ending_node_id: string | null
  score: Record<string, number> | null
  metadata: Record<string, unknown>
  created_at: string
}

function rowToScenario(row: Record<string, unknown>): Scenario {
  return {
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    description: row.description as string | undefined,
    status: row.status as Scenario['status'],
    nodes: (row.nodes as Scenario['nodes']) ?? [],
    edges: (row.edges as Scenario['edges']) ?? [],
    startNodeId: row.start_node_id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    thumbnailUrl: row.thumbnail_url as string | undefined,
    // published_version is stored as a ScenarioVersion JSON blob (camelCase), not a DB row
    publishedVersion: (row.published_version as ScenarioVersion | undefined) ?? undefined,
  }
}

function rowToVersion(row: Record<string, unknown>): ScenarioVersion {
  return {
    id: row.id as string,
    scenarioId: row.scenario_id as string,
    version: row.version as number,
    title: row.title as string | undefined,
    nodes: (row.nodes as ScenarioVersion['nodes']) ?? [],
    edges: (row.edges as ScenarioVersion['edges']) ?? [],
    startNodeId: row.start_node_id as string,
    publishedAt: row.published_at as string,
    slug: row.slug as string,
  }
}
