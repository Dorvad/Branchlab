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
    nodes: ((row.nodes as ScenarioNode[]) ?? []).map(n => ({ ...n, choices: n.choices ?? [] })),
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
    nodes: ((row.nodes as ScenarioNode[]) ?? []).map(n => ({ ...n, choices: n.choices ?? [] })),
    edges: (row.edges as ScenarioEdge[]) ?? [],
    startNodeId: row.start_node_id,
    publishedAt: row.published_at,
    slug: row.slug,
  }
}

function scenarioToRow(scenario: Scenario, userId: string, orgId?: string | null) {
  const row: Record<string, unknown> = {
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
  // Only include org_id when it has a value — avoids breaking on DBs where
  // the 003_organizations migration hasn't been applied yet.
  if (orgId) row.org_id = orgId
  return row
}

// ── Error helper ──────────────────────────────────────────────────────────────

// Supabase returns PostgrestError objects (not Error instances). Convert them
// so callers always catch a real Error with a human-readable message.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbError(err: any): Error {
  const msg = err?.message ?? err?.details ?? err?.hint ?? 'Database error'
  return new Error(msg)
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

/**
 * Returns scenarios scoped to the current context:
 * - orgId = null  → personal scenarios (org_id IS NULL, owned by current user)
 * - orgId = uuid  → org scenarios (org_id = orgId; RLS enforces membership)
 */
export async function getAllScenarios(orgId: string | null = null): Promise<Scenario[]> {
  const userId = await requireUserId()
  const sb = getSupabaseClient()

  let query = sb.from('scenarios').select('*').order('updated_at', { ascending: false })

  if (orgId) {
    query = query.eq('org_id', orgId)
  } else {
    // Filter by user_id only — avoids referencing org_id when the column may
    // not exist yet (migration not yet applied to this Supabase project).
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query
  if (error) throw dbError(error)
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
export async function saveScenario(scenario: Scenario, orgId?: string | null): Promise<Scenario> {
  const userId = await requireUserId()
  const sb = getSupabaseClient()
  const row = scenarioToRow(scenario, userId, orgId)

  const { data, error } = await sb
    .from('scenarios')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single()

  if (error) throw dbError(error)
  return rowToScenario(data)
}

export async function deleteScenario(id: string): Promise<void> {
  await requireUserId()
  const sb = getSupabaseClient()
  const { error } = await sb.from('scenarios').delete().eq('id', id)
  if (error) throw dbError(error)
}

// ── Publish ────────────────────────────────────────────────────────────────────

/**
 * Publishes a scenario:
 *   1. Inserts or updates a snapshot in scenario_versions
 *      - Republish to same slug → UPDATE existing row by id
 *      - New publish or new slug → INSERT with a fresh UUID
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

  // Step 1 — write the version snapshot
  // Upsert via ON CONFLICT doesn't work reliably because PostgREST includes id=null
  // in the generated INSERT, overriding the gen_random_uuid() default. Use explicit
  // INSERT vs UPDATE instead.
  const isRepublish = !!prevVersion?.id && prevVersion.slug === slug

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let versionRow: any
  if (isRepublish) {
    const { data, error } = await sb
      .from('scenario_versions')
      .update({
        version: versionNumber,
        title: scenario.title,
        nodes: scenario.nodes,
        edges: scenario.edges,
        start_node_id: scenario.startNodeId,
        published_at: now,
      })
      .eq('id', prevVersion!.id)
      .select()
      .single()
    if (error) throw dbError(error)
    versionRow = data
  } else {
    const { data, error } = await sb
      .from('scenario_versions')
      .insert({
        id: crypto.randomUUID(),
        scenario_id: scenario.id,
        user_id: userId,
        version: versionNumber,
        title: scenario.title,
        nodes: scenario.nodes,
        edges: scenario.edges,
        start_node_id: scenario.startNodeId,
        slug,
        published_at: now,
      })
      .select()
      .single()
    if (error) throw dbError(error)
    versionRow = data
  }

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

  if (scenarioError) throw dbError(scenarioError)
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
