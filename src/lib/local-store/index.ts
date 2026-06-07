import type { Scenario, ScenarioEdge, ScenarioVersion, PublishConfig } from '@/types'
import { mockScenarios } from '@/data/mock-scenarios'
import { mockPublishedScenarios } from '@/data/mock-scenarios'

// ── Storage keys ───────────────────────────────────────────────────────────────

const DRAFTS_KEY = 'branchlab_scenarios'
const PUBLISHED_KEY = 'branchlab_published'

// ── Private helpers ────────────────────────────────────────────────────────────

let _nonce = 0
function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${++_nonce}`
}

function readDrafts(): Record<string, Scenario> {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, Scenario>) : {}
  } catch {
    return {}
  }
}

function writeDrafts(data: Record<string, Scenario>): void {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(data))
  } catch {
    // quota exceeded or unavailable
  }
}

function readPublished(): Record<string, ScenarioVersion> {
  try {
    const raw = localStorage.getItem(PUBLISHED_KEY)
    return raw ? (JSON.parse(raw) as Record<string, ScenarioVersion>) : {}
  } catch {
    return {}
  }
}

function writePublished(data: Record<string, ScenarioVersion>): void {
  try {
    localStorage.setItem(PUBLISHED_KEY, JSON.stringify(data))
  } catch {
    // quota exceeded or unavailable
  }
}

// Seed draft store with mock scenarios on first visit
function seedDraftsIfNeeded(): void {
  if (localStorage.getItem(DRAFTS_KEY) !== null) return
  const seed: Record<string, Scenario> = {}
  for (const s of mockScenarios) seed[s.id] = s
  writeDrafts(seed)
}

// Seed published store with mock published versions on first visit
function seedPublishedIfNeeded(): void {
  if (localStorage.getItem(PUBLISHED_KEY) !== null) return
  const seed: Record<string, ScenarioVersion> = {}
  for (const [slug, version] of Object.entries(mockPublishedScenarios)) {
    seed[slug] = version
  }
  writePublished(seed)
}

// ── Slug utilities ─────────────────────────────────────────────────────────────

/** Converts an arbitrary string into a URL-safe slug. */
export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'untitled'
  )
}

/**
 * Validates a slug string. Returns an error message, or null if valid.
 * Pass `ownScenarioId` to allow a scenario to reclaim its own existing slug.
 */
export function validateSlug(slug: string, ownScenarioId?: string): string | null {
  if (!slug || slug.length < 2) return 'Must be at least 2 characters'
  if (slug.length > 60) return 'Must be 60 characters or less'
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) {
    return 'Only lowercase letters, numbers, and hyphens; cannot start or end with a hyphen'
  }
  if (!isSlugAvailable(slug, ownScenarioId)) return 'This URL is already taken'
  return null
}

/** Returns true if the slug is unused, or if it belongs to `ownScenarioId`. */
export function isSlugAvailable(slug: string, ownScenarioId?: string): boolean {
  seedPublishedIfNeeded()
  const store = readPublished()
  const existing = store[slug]
  if (!existing) return true
  return ownScenarioId !== undefined && existing.scenarioId === ownScenarioId
}

// ── Draft CRUD ─────────────────────────────────────────────────────────────────

/** Returns all draft scenarios sorted newest-first. Seeds on first call. */
export function getAllScenarios(): Scenario[] {
  seedDraftsIfNeeded()
  return Object.values(readDrafts()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

/**
 * Returns the locally stored scenario for the given ID, or null.
 * Does NOT seed — call getAllScenarios() from the dashboard to trigger seeding.
 */
export function getLocalScenario(id: string): Scenario | null {
  try {
    return readDrafts()[id] ?? null
  } catch {
    return null
  }
}

/** Saves (creates or overwrites) a scenario. Stamps updatedAt. Returns stored copy. */
export function saveScenario(scenario: Scenario): Scenario {
  const stored: Scenario = { ...scenario, updatedAt: new Date().toISOString() }
  const drafts = readDrafts()
  drafts[stored.id] = stored
  writeDrafts(drafts)
  return stored
}

export function deleteScenario(id: string): void {
  const drafts = readDrafts()
  delete drafts[id]
  writeDrafts(drafts)
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

// ── Templates ──────────────────────────────────────────────────────────────────

export type TemplateId = 'two-path' | 'three-way' | 'linear-twist'

export interface ScenarioTemplate {
  id: TemplateId
  title: string
  description: string
  structure: string
}

export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: 'two-path',
    title: 'Two-Path Branch',
    description: 'A classic fork — one decision splits the story into two paths that reunite at a single ending.',
    structure: 'Start → 2 paths → 1 ending',
  },
  {
    id: 'three-way',
    title: 'Three-Way Fork',
    description: 'The opening scene branches into three distinct directions, each leading to its own unique outcome.',
    structure: 'Start → 3 paths → 3 endings',
  },
  {
    id: 'linear-twist',
    title: 'Linear with a Twist',
    description: 'A mostly straight-line story that opens up into one final choice between two very different endings.',
    structure: 'Start → straight path → 2 endings',
  },
]

function buildTwoPathTemplate(id: string, startId: string, now: string): Scenario {
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

function buildThreeWayTemplate(id: string, startId: string, now: string): Scenario {
  const pathAId = uid('node')
  const pathBId = uid('node')
  const pathCId = uid('node')
  const endingAId = uid('node')
  const endingBId = uid('node')
  const endingCId = uid('node')
  const choiceAId = uid('choice')
  const choiceBId = uid('choice')
  const choiceCId = uid('choice')
  const choiceA2Id = uid('choice')
  const choiceB2Id = uid('choice')
  const choiceC2Id = uid('choice')

  const edges: ScenarioEdge[] = [
    { id: uid('edge'), sourceNodeId: startId, targetNodeId: pathAId, choiceId: choiceAId },
    { id: uid('edge'), sourceNodeId: startId, targetNodeId: pathBId, choiceId: choiceBId },
    { id: uid('edge'), sourceNodeId: startId, targetNodeId: pathCId, choiceId: choiceCId },
    { id: uid('edge'), sourceNodeId: pathAId, targetNodeId: endingAId, choiceId: choiceA2Id },
    { id: uid('edge'), sourceNodeId: pathBId, targetNodeId: endingBId, choiceId: choiceB2Id },
    { id: uid('edge'), sourceNodeId: pathCId, targetNodeId: endingCId, choiceId: choiceC2Id },
  ]

  return {
    id,
    title: 'My New Scenario',
    slug: `my-scenario-${Date.now()}`,
    description: 'A branching video scenario with three distinct paths.',
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
        description: 'Set the scene. What three directions could this go?',
        choices: [
          { id: choiceAId, label: 'Choice A', targetNodeId: pathAId },
          { id: choiceBId, label: 'Choice B', targetNodeId: pathBId },
          { id: choiceCId, label: 'Choice C', targetNodeId: pathCId },
        ],
        position: { x: 460, y: 40 },
      },
      {
        id: pathAId,
        type: 'scene',
        title: 'Path A',
        description: '',
        choices: [{ id: choiceA2Id, label: 'Continue', targetNodeId: endingAId }],
        position: { x: 100, y: 280 },
      },
      {
        id: pathBId,
        type: 'scene',
        title: 'Path B',
        description: '',
        choices: [{ id: choiceB2Id, label: 'Continue', targetNodeId: endingBId }],
        position: { x: 460, y: 280 },
      },
      {
        id: pathCId,
        type: 'scene',
        title: 'Path C',
        description: '',
        choices: [{ id: choiceC2Id, label: 'Continue', targetNodeId: endingCId }],
        position: { x: 820, y: 280 },
      },
      {
        id: endingAId,
        type: 'ending',
        title: 'Outcome A',
        description: '',
        choices: [],
        position: { x: 100, y: 520 },
      },
      {
        id: endingBId,
        type: 'ending',
        title: 'Outcome B',
        description: '',
        choices: [],
        position: { x: 460, y: 520 },
      },
      {
        id: endingCId,
        type: 'ending',
        title: 'Outcome C',
        description: '',
        choices: [],
        position: { x: 820, y: 520 },
      },
    ],
  }
}

function buildLinearTwistTemplate(id: string, startId: string, now: string): Scenario {
  const middleId = uid('node')
  const twistId = uid('node')
  const goodEndingId = uid('node')
  const badEndingId = uid('node')
  const choiceStartId = uid('choice')
  const choiceMiddleId = uid('choice')
  const choiceGoodId = uid('choice')
  const choiceBadId = uid('choice')

  const edges: ScenarioEdge[] = [
    { id: uid('edge'), sourceNodeId: startId, targetNodeId: middleId, choiceId: choiceStartId },
    { id: uid('edge'), sourceNodeId: middleId, targetNodeId: twistId, choiceId: choiceMiddleId },
    { id: uid('edge'), sourceNodeId: twistId, targetNodeId: goodEndingId, choiceId: choiceGoodId },
    { id: uid('edge'), sourceNodeId: twistId, targetNodeId: badEndingId, choiceId: choiceBadId },
  ]

  return {
    id,
    title: 'My New Scenario',
    slug: `my-scenario-${Date.now()}`,
    description: 'A linear scenario that opens into a final choice between two endings.',
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
        description: 'Set the scene. Where does the story begin?',
        choices: [{ id: choiceStartId, label: 'Continue', targetNodeId: middleId }],
        position: { x: 380, y: 40 },
      },
      {
        id: middleId,
        type: 'scene',
        title: 'Rising Action',
        description: 'Build tension toward the turning point.',
        choices: [{ id: choiceMiddleId, label: 'Continue', targetNodeId: twistId }],
        position: { x: 380, y: 260 },
      },
      {
        id: twistId,
        type: 'scene',
        title: 'The Twist',
        description: 'The moment everything changes — what does the audience choose?',
        choices: [
          { id: choiceGoodId, label: 'Take the high road', targetNodeId: goodEndingId },
          { id: choiceBadId, label: 'Take the low road', targetNodeId: badEndingId },
        ],
        position: { x: 380, y: 480 },
      },
      {
        id: goodEndingId,
        type: 'ending',
        title: 'Triumphant Ending',
        description: '',
        choices: [],
        position: { x: 160, y: 720 },
      },
      {
        id: badEndingId,
        type: 'ending',
        title: 'Bittersweet Ending',
        description: '',
        choices: [],
        position: { x: 600, y: 720 },
      },
    ],
  }
}

/** Creates a new scenario pre-populated with one of the branching templates. Not yet saved. */
export function createFromTemplate(templateId: TemplateId = 'two-path'): Scenario {
  const now = new Date().toISOString()
  const id = uid('scenario')
  const startId = uid('node')

  switch (templateId) {
    case 'three-way':
      return buildThreeWayTemplate(id, startId, now)
    case 'linear-twist':
      return buildLinearTwistTemplate(id, startId, now)
    case 'two-path':
    default:
      return buildTwoPathTemplate(id, startId, now)
  }
}

// ── Publish ────────────────────────────────────────────────────────────────────

/**
 * Publishes a scenario by:
 *   1. Creating an immutable ScenarioVersion snapshot
 *   2. Writing it to the published store keyed by slug
 *   3. Updating the draft scenario's status, slug, and publishedVersion
 *
 * Returns the updated draft scenario so callers can update React state.
 */
export function publishScenario(scenario: Scenario, config: PublishConfig): Scenario {
  const { slug, orientation, passwordProtected, password } = config
  const now = new Date().toISOString()
  const prevVersion = scenario.publishedVersion
  const versionNumber = prevVersion ? prevVersion.version + 1 : 1

  const version: ScenarioVersion = {
    id: uid('version'),
    scenarioId: scenario.id,
    version: versionNumber,
    title: scenario.title,
    // Deep-copy nodes/edges so future draft edits don't affect the snapshot
    nodes: JSON.parse(JSON.stringify(scenario.nodes)),
    edges: JSON.parse(JSON.stringify(scenario.edges)),
    startNodeId: scenario.startNodeId,
    publishedAt: now,
    slug,
    orientation,
    passwordProtected,
    password: passwordProtected ? password : undefined,
  }

  // Write snapshot to published store
  const pubStore = readPublished()
  pubStore[slug] = version
  writePublished(pubStore)

  // Update the draft to reflect published state
  const updatedDraft: Scenario = {
    ...scenario,
    status: 'published',
    slug,
    publishedVersion: version,
    updatedAt: now,
  }

  const draftStore = readDrafts()
  draftStore[scenario.id] = updatedDraft
  writeDrafts(draftStore)

  return updatedDraft
}

// ── Published store reads ──────────────────────────────────────────────────────

export function getPublishedBySlug(slug: string): ScenarioVersion | null {
  seedPublishedIfNeeded()
  try {
    const fromPublished = readPublished()[slug]
    if (fromPublished) return fromPublished

    // Fallback: scan draft store for scenarios whose publishedVersion.slug matches.
    // This recovers when branchlab_published is out of sync (e.g. session change).
    const drafts = readDrafts()
    for (const scenario of Object.values(drafts)) {
      const pv = scenario.publishedVersion
      if (pv && (pv.slug === slug || scenario.slug === slug)) {
        // Rebuild the published index entry so future lookups are fast
        const store = readPublished()
        store[slug] = pv
        writePublished(store)
        return pv
      }
    }
    return null
  } catch {
    return null
  }
}
