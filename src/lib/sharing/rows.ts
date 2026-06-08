import type { ScenarioVersion, ScenarioVisibility, ScenarioNode, ScenarioEdge } from '@/types'
import type { ShareSettings, ShareToken } from '@/types/sharing'

/** Maps a raw scenario_versions row (as read by the service-role gate) to the player-facing shape. Never includes password_hash. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function versionRowToScenarioVersion(row: any): ScenarioVersion {
  return {
    id: row.id,
    scenarioId: row.scenario_id,
    version: row.version,
    title: row.title,
    nodes: ((row.nodes as ScenarioNode[]) ?? []).map((n) => ({ ...n, choices: n.choices ?? [] })),
    edges: (row.edges as ScenarioEdge[]) ?? [],
    startNodeId: row.start_node_id,
    publishedAt: row.published_at,
    slug: row.slug,
    orientation: row.orientation ?? undefined,
    visibility: (row.visibility ?? undefined) as ScenarioVisibility | undefined,
    accessEnabled: row.access_enabled ?? undefined,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function versionRowToShareSettings(row: any, scenarioId: string): ShareSettings {
  return {
    scenarioId,
    versionId: row.id,
    slug: row.slug,
    visibility: (row.visibility ?? 'public') as ScenarioVisibility,
    accessEnabled: row.access_enabled ?? true,
    hasPassword: !!row.password_hash,
    updatedAt: row.updated_at ?? undefined,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToShareToken(row: any): ShareToken {
  return {
    id: row.id,
    scenarioVersionId: row.scenario_version_id,
    scenarioId: row.scenario_id ?? null,
    token: row.token,
    label: row.label ?? null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? null,
    revokedAt: row.revoked_at ?? null,
    lastUsedAt: row.last_used_at ?? null,
    useCount: row.use_count ?? 0,
  }
}
