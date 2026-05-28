/**
 * Supabase scenario repository.
 *
 * Thin named-interface wrapper over src/lib/scenario-store.ts.
 * All Supabase queries live there; this file exposes the function names
 * specified for the repository layer so callers can import from one place.
 *
 * NOT wired to the dashboard/editor/player yet — use scenario-store directly
 * until the persistence-mode flag is threaded through those entry points.
 */

import {
  getAllScenarios,
  getScenario,
  saveScenario,
  deleteScenario,
  publishScenario as _publishScenario,
  createFromTemplate,
} from '@/lib/scenario-store'

import {
  createScenario as _createScenario,
  duplicateScenario as _duplicateScenario,
} from '@/lib/local-store'

import type { Scenario, PublishConfig } from '@/types'

export type CreateScenarioInput = {
  title?: string
  fromTemplate?: boolean
}

// ── Read ──────────────────────────────────────────────────────────────────────

/** Returns all scenarios the current user can see (personal + org if orgId given). */
export async function getScenariosForCurrentUser(
  orgId: string | null = null,
): Promise<Scenario[]> {
  return getAllScenarios(orgId)
}

/** Returns a single scenario by ID, or null if not found / not authorised. */
export async function getScenarioById(id: string): Promise<Scenario | null> {
  return getScenario(id)
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Creates a blank scenario (or from template) and persists it.
 * Returns the saved scenario with its DB-assigned timestamps.
 */
export async function createScenario(
  input: CreateScenarioInput = {},
  orgId: string | null = null,
): Promise<Scenario> {
  const draft = input.fromTemplate ? createFromTemplate() : _createScenario()
  if (input.title) draft.title = input.title
  return saveScenario(draft, orgId)
}

/**
 * Applies partial updates to an existing scenario and persists it.
 * Fetches the current row first so unspecified fields are preserved.
 * Throws if the scenario is not found.
 */
export async function updateScenario(
  id: string,
  updates: Partial<Pick<Scenario, 'title' | 'description' | 'nodes' | 'edges' | 'startNodeId'>>,
  orgId: string | null = null,
): Promise<Scenario> {
  const existing = await getScenario(id)
  if (!existing) throw new Error(`Scenario not found: ${id}`)
  return saveScenario({ ...existing, ...updates }, orgId)
}

/** Deletes a scenario by ID. */
export async function deleteScenarioById(id: string): Promise<void> {
  return deleteScenario(id)
}

/**
 * Duplicates a scenario: loads the source, creates an unsaved copy,
 * then persists the copy. Returns the new saved scenario.
 */
export async function duplicateScenario(
  id: string,
  orgId: string | null = null,
): Promise<Scenario> {
  const source = await getScenario(id)
  if (!source) throw new Error(`Scenario not found: ${id}`)
  const copy = _duplicateScenario(source)
  return saveScenario(copy, orgId)
}

/**
 * Publishes a scenario under the given slug.
 * Returns the updated scenario with publishedVersion populated.
 */
export async function publishScenario(
  id: string,
  config: PublishConfig,
): Promise<Scenario> {
  const scenario = await getScenario(id)
  if (!scenario) throw new Error(`Scenario not found: ${id}`)
  return _publishScenario(scenario, config)
}
