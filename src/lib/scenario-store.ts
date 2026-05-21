/**
 * Supabase-backed scenario store.
 * Replaces src/lib/local-store/index.ts with async equivalents.
 */
import { getSupabaseClient } from './supabase/client'
import type { Scenario, ScenarioVersion, ScenarioNode, ScenarioEdge, PublishConfig } from '@/types'

// ── Re-export pure utilities that have no persistence dependency ───────────────

export {
  slugify,
  createScenario,
  createFromTemplate,
  duplicateScenario,
} from './local-store'

// ── Row ↔ Type mappers ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToScenario(row: any): Scenario {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug ?? '',
    description: row.description ?? '',
    status: row.status,
    nodes: (row.nodes as ScenarioNode[]) ?? [],
    edges: (row.edges as ScenarioEdge[]) ?? [],
    startNodeId: row.start_node_id,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedVersion: row.published_version ?? undefined,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToVersion(row: any): ScenarioVersion {
  return {
    id: row.id,
    scenarioId: row.scenario_id,
    version: row.version,
    title: row.title,
    nodes: (row.nodes as ScenarioNode[]) ?? [],
    edges: (row.edges as ScenarioEdge[]) ?? [],
    startNodeId: row.start_node_id,
    publishedAt: row.published_at,
    slug: row.slug,
  }
}

function scenarioToRow(scenario: Scenario, userId: string) {
  return {
    id: scenario.id,
    user_id: userId,
    title: scenario.title,
    slug: scenario.slug ?? '',
    description: scenario.description ?? '',
    status: scenario.status,
    nodes: scenario.nodes,
    edges: scenario.edges,
    start_node_id: scenario.startNodeId,
    thumbnail_url: scenario.thumbnailUrl ?? null,
    published_version: scenario.publishedVersion ?? null,
  }
}

// ── Auth helper ───────────────────────────────────────────────────────────────

async function requireUserId(): Promise<string> {
  const sb = getSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// ── Slug utilities ─────────────────────────────────────────────────────────────

/** Format-only slug validation. Returns error string or null. */
export function validateSlugFormat(slug: string): string | null {
  if (!slug || slug.length < 2) return 'Must be at least 2 characters'
  if (slug.length > 60) return 'Must be 60 characters or less'
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) {
    return 'Only lowercase letters, numbers, and hyphens; cannot start or end with a hyphen'
  }
  return null
}

/**
 * Checks whether a slug is available in scenario_versions.
 * Pass `ownScenarioId` to allow a scenario to reclaim its own published slug.
 */
export async function isSlugAvailable(slug: string, ownScenarioId?: string): Promise<boolean> {
  try {
    const sb = getSupabaseClient()
    const { data, error } = await sb
      .from('scenario_versions')
      .select('scenario_id')
      .eq('slug', slug)
      .maybeSingle()

    if (error) return true // table not yet created or network issue — assume available
    if (!data) return true
    const row = data as { scenario_id: string }
    return ownScenarioId !== undefined && row.scenario_id === ownScenarioId
  } catch {
    return true
  }
}

/** Full slug validation including DB availability check. Returns error string or null. */
export async function validateSlug(slug: string, ownScenarioId?: string): Promise<string | null> {
  const formatError = validateSlugFormat(slug)
  if (formatError) return formatError
  const available = await isSlugAvailable(slug, ownScenarioId)
  if (!available) return 'This URL is already taken'
  return null
}

// ── Draft CRUD ─────────────────────────────────────────────────────────────────

/** Returns all scenarios for the current user, newest-first. */
export async function getAllScenarios(): Promise<Scenario[]> {
  const userId = await requireUserId()
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('scenarios')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(rowToScenario)
}

/** Returns a single scenario by ID, or null if not found. */
export async function getScenario(id: string): Promise<Scenario | null> {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('scenarios')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return rowToScenario(data)
}

/** Upserts a scenario. Stamps updated_at via a DB trigger. Returns saved scenario. */
export async function saveScenario(scenario: Scenario): Promise<Scenario> {
  const userId = await requireUserId()
  const sb = getSupabaseClient()
  const row = scenarioToRow(scenario, userId)

  const { data, error } = await sb
    .from('scenarios')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single()

  if (error) throw error
  return rowToScenario(data)
}

export async function deleteScenario(id: string): Promise<void> {
  const sb = getSupabaseClient()
  const { error } = await sb.from('scenarios').delete().eq('id', id)
  if (error) throw error
}

// ── Publish ────────────────────────────────────────────────────────────────────

/**
 * Publishes a scenario:
 *   1. Upserts an immutable snapshot into scenario_versions (ON CONFLICT slug → UPDATE)
 *   2. Updates the draft status/slug/published_version
 *
 * Returns the updated Scenario so callers can update React state.
 */
export async function publishScenario(scenario: Scenario, config: PublishConfig): Promise<Scenario> {
  const { slug, orientation, passwordProtected, password } = config
  const userId = await requireUserId()
  const sb = getSupabaseClient()
  const now = new Date().toISOString()
  const prevVersion = scenario.publishedVersion
  const versionNumber = prevVersion ? prevVersion.version + 1 : 1

  // Step 1 — upsert the version snapshot
  const { data: versionRow, error: versionError } = await sb
    .from('scenario_versions')
    .upsert(
      {
        scenario_id: scenario.id,
        user_id: userId,
        version: versionNumber,
        title: scenario.title,
        nodes: scenario.nodes,
        edges: scenario.edges,
        start_node_id: scenario.startNodeId,
        slug,
        published_at: now,
      },
      {
        onConflict: 'slug',
        ignoreDuplicates: false,
      }
    )
    .select()
    .single()

  if (versionError) throw versionError

  // Enrich the stored version with config metadata (stored in the JSONB field on scenarios)
  const publishedVersion: ScenarioVersion = {
    ...rowToVersion(versionRow),
    orientation,
    passwordProtected,
    password: passwordProtected ? password : undefined,
  }

  // Step 2 — update the draft scenario's status
  const { data: scenarioRow, error: scenarioError } = await sb
    .from('scenarios')
    .update({
      status: 'published',
      slug,
      published_version: publishedVersion,
      updated_at: now,
    })
    .eq('id', scenario.id)
    .select()
    .single()

  if (scenarioError) throw scenarioError
  return rowToScenario(scenarioRow)
}

// ── Published store reads (public — no auth required) ─────────────────────────

export async function getPublishedBySlug(slug: string): Promise<ScenarioVersion | null> {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('scenario_versions')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) return null
  return rowToVersion(data)
}
