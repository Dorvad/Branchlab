/**
 * Mode-aware scenario data access for the dashboard.
 * Returns the same async interface regardless of persistence mode.
 *
 * local   → src/lib/local-store  (localStorage, synchronous under the hood)
 * supabase → src/lib/scenario-store (Supabase, requires auth)
 */

import { isSupabaseMode } from './mode'
import * as localStore from '@/lib/local-store'
import * as supabaseStore from '@/lib/scenario-store'
import type { Scenario, PublishConfig, ScenarioVersion } from '@/types'

export async function getAllScenarios(orgId: string | null = null): Promise<Scenario[]> {
  if (isSupabaseMode()) return supabaseStore.getAllScenarios(orgId)
  return Promise.resolve(localStore.getAllScenarios())
}

export async function getScenarioById(id: string): Promise<Scenario | null> {
  if (isSupabaseMode()) return supabaseStore.getScenario(id)
  return Promise.resolve(localStore.getLocalScenario(id))
}

export async function saveScenario(scenario: Scenario, orgId?: string | null): Promise<Scenario> {
  if (isSupabaseMode()) return supabaseStore.saveScenario(scenario, orgId)
  return Promise.resolve(localStore.saveScenario(scenario))
}

export async function publishScenario(scenario: Scenario, config: PublishConfig): Promise<Scenario> {
  if (isSupabaseMode()) return supabaseStore.publishScenario(scenario, config)
  // local-store takes only the slug; other config fields (orientation etc.) are ignored in local mode
  return Promise.resolve(localStore.publishScenario(scenario, config.slug))
}

export async function isSlugAvailable(slug: string, ownScenarioId?: string): Promise<boolean> {
  if (isSupabaseMode()) return supabaseStore.isSlugAvailable(slug, ownScenarioId)
  return Promise.resolve(localStore.isSlugAvailable(slug, ownScenarioId))
}

export async function getPublishedBySlug(slug: string): Promise<ScenarioVersion | null> {
  if (isSupabaseMode()) return supabaseStore.getPublishedBySlug(slug)
  return Promise.resolve(localStore.getPublishedBySlug(slug))
}
