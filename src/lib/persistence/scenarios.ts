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
import type { Scenario } from '@/types'

export async function getAllScenarios(orgId: string | null = null): Promise<Scenario[]> {
  if (isSupabaseMode()) return supabaseStore.getAllScenarios(orgId)
  // local-store is synchronous — wrap so callers always get a Promise
  return Promise.resolve(localStore.getAllScenarios())
}

export async function saveScenario(scenario: Scenario, orgId?: string | null): Promise<Scenario> {
  if (isSupabaseMode()) return supabaseStore.saveScenario(scenario, orgId)
  return Promise.resolve(localStore.saveScenario(scenario))
}
