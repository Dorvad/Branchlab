import type { Scenario, ScenarioEdge } from '@/types'
import { mockScenarios } from '@/data/mock-scenarios'

const STORE_KEY = 'branchlab_scenarios'

// ── Private helpers ────────────────────────────────────────────────────────────

let _nonce = 0
function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${++_nonce}`
}

function readStore(): Record<string, Scenario> {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, Scenario>) : {}
  } catch {
    return {}
  }
}

function writeStore(data: Record<string, Scenario>): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data))
  } catch {
    // quota exceeded or unavailable — fail silently
  }
}

// On first visit (no STORE_KEY in localStorage at all), seed with mock scenarios
// so the dashboard isn't empty out of the box.
function seedIfNeeded(): void {
  if (localStorage.getItem(STORE_KEY) !== null) return
  const seed: Record<string, Scenario> = {}
  for (const s of mockScenarios) {
    seed[s.id] = s
  }
  writeStore(seed)
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Returns all scenarios sorted newest-first. Seeds on first call. */
export function getAllScenarios(): Scenario[] {
  seedIfNeeded()
  return Object.values(readStore()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

/**
 * Returns the locally stored scenario for the given ID, or null.
 * Does NOT seed — call getAllScenarios() from the dashboard to trigger seeding.
 */
export function getLocalScenario(id: string): Scenario | null {
  try {
    const store = readStore()
    return store[id] ?? null
  } catch {
    return null
  }
}

/**
 * Saves (creates or overwrites) a scenario. Stamps updatedAt with current time.
 * Returns the stored scenario (with updated timestamp).
 */
export function saveScenario(scenario: Scenario): Scenario {
  const stored: Scenario = { ...scenario, updatedAt: new Date().toISOString() }
  const store = readStore()
  store[stored.id] = stored
  writeStore(store)
  return stored
}

export function deleteScenario(id: string): void {
  const store = readStore()
  delete store[id]
  writeStore(store)
}

/** Returns an unsaved copy with a new ID. Caller must saveScenario() it. */
export function duplicateScenario(source: Scenario): Scenario {
  const now = new Date().toISOString()
  return {
    ...source,
    id: uid('scenario'),
    title: `${source.title} (copy)`,
    slug: `${source.slug}-copy`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    publishedVersion: undefined,
  }
}

/** Creates a new blank scenario with a single start node. Not yet saved. */
export function createScenario(): Scenario {
  const now = new Date().toISOString()
  const id = uid('scenario')
  const nodeId = uid('node')
  return {
    id,
    title: 'Untitled Scenario',
    slug: `untitled-${Date.now()}`,
    description: '',
    status: 'draft',
    startNodeId: nodeId,
    createdAt: now,
    updatedAt: now,
    nodes: [
      {
        id: nodeId,
        type: 'start',
        title: 'Start',
        description: '',
        choices: [],
        position: { x: 380, y: 40 },
      },
    ],
    edges: [],
  }
}

/** Creates a new scenario pre-populated with a simple branching template. Not yet saved. */
export function createFromTemplate(): Scenario {
  const now = new Date().toISOString()
  const id = uid('scenario')
  const startId = uid('node')
  const pathAId = uid('node')
  const pathBId = uid('node')
  const endingId = uid('node')
  const choiceAId = uid('choice')
  const choiceBId = uid('choice')
  const choiceA2Id = uid('choice')
  const choiceB2Id = uid('choice')

  const edges: ScenarioEdge[] = [
    { id: uid('edge'), sourceNodeId: startId, targetNodeId: pathAId, choiceId: choiceAId },
    { id: uid('edge'), sourceNodeId: startId, targetNodeId: pathBId, choiceId: choiceBId },
    { id: uid('edge'), sourceNodeId: pathAId, targetNodeId: endingId, choiceId: choiceA2Id },
    { id: uid('edge'), sourceNodeId: pathBId, targetNodeId: endingId, choiceId: choiceB2Id },
  ]

  return {
    id,
    title: 'My New Scenario',
    slug: `my-scenario-${Date.now()}`,
    description: 'A branching video scenario.',
    status: 'draft',
    startNodeId: startId,
    createdAt: now,
    updatedAt: now,
    edges,
    nodes: [
      {
        id: startId,
        type: 'start',
        title: 'Opening Scene',
        description: 'Set the scene. What happens first?',
        choices: [
          { id: choiceAId, label: 'Choice A', targetNodeId: pathAId },
          { id: choiceBId, label: 'Choice B', targetNodeId: pathBId },
        ],
        position: { x: 380, y: 40 },
      },
      {
        id: pathAId,
        type: 'scene',
        title: 'Path A',
        description: '',
        choices: [{ id: choiceA2Id, label: 'Continue', targetNodeId: endingId }],
        position: { x: 160, y: 280 },
      },
      {
        id: pathBId,
        type: 'scene',
        title: 'Path B',
        description: '',
        choices: [{ id: choiceB2Id, label: 'Continue', targetNodeId: endingId }],
        position: { x: 600, y: 280 },
      },
      {
        id: endingId,
        type: 'ending',
        title: 'The Outcome',
        description: '',
        choices: [],
        position: { x: 380, y: 520 },
      },
    ],
  }
}
