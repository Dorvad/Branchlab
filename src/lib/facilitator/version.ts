// Fetches a published scenario_versions row by id — needed because facilitator
// sessions pin to a specific version, not the live "latest" slug lookup that
// getPublishedBySlug performs. scenario_versions has a public-read RLS policy
// (see migration 001), so anonymous participants can read this directly too.

import { getSupabaseClient } from '@/lib/supabase/client'
import type { ScenarioVersion, ScenarioNode, ScenarioEdge } from '@/types'

export async function fetchScenarioVersion(versionId: string): Promise<ScenarioVersion | null> {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('scenario_versions')
    .select('*')
    .eq('id', versionId)
    .maybeSingle()

  if (error || !data) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any
  return {
    id: row.id,
    scenarioId: row.scenario_id,
    version: row.version,
    title: row.title,
    nodes: ((row.nodes as ScenarioNode[]) ?? []).map(n => ({ ...n, choices: n.choices ?? [] })),
    edges: (row.edges as ScenarioEdge[]) ?? [],
    startNodeId: row.start_node_id,
    publishedAt: row.published_at,
    slug: row.slug,
    orientation: row.orientation ?? undefined,
    visibility: row.visibility ?? undefined,
    accessEnabled: row.access_enabled ?? undefined,
  }
}
