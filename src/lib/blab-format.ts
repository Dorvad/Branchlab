import { slugify } from '@/lib/local-store'
import type { Scenario, ScenarioVersion } from '@/types'

export interface BlabFile {
  format: 'blab'
  version: '1.0'
  exportedAt: string
  scenario: ScenarioVersion
}

function isScenarioVersion(s: Scenario | ScenarioVersion): s is ScenarioVersion {
  return 'scenarioId' in s && 'publishedAt' in s
}

function scenarioToVersion(s: Scenario): ScenarioVersion {
  return {
    id: s.id,
    scenarioId: s.id,
    version: 1,
    title: s.title,
    nodes: s.nodes,
    edges: s.edges,
    startNodeId: s.startNodeId,
    publishedAt: s.updatedAt ?? new Date().toISOString(),
    slug: s.slug ?? slugify(s.title),
    orientation: undefined,
    visibility: 'public',
    accessEnabled: true,
  }
}

export function exportToBlab(scenario: Scenario | ScenarioVersion): void {
  const sv = isScenarioVersion(scenario) ? scenario : scenarioToVersion(scenario)
  const payload: BlabFile = {
    format: 'blab',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    scenario: sv,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${slugify(sv.title ?? 'scenario')}.blab`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importFromBlab(file: File): Promise<BlabFile> {
  const text = await file.text()
  const parsed = JSON.parse(text)
  if (parsed?.format !== 'blab') {
    throw new Error('Invalid .blab file: missing format header')
  }
  if (!parsed.scenario?.nodes || !Array.isArray(parsed.scenario.nodes)) {
    throw new Error('Invalid .blab file: missing scenario data')
  }
  return parsed as BlabFile
}

export function blabToScenario(blab: BlabFile): Scenario {
  const sv = blab.scenario
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title: sv.title ?? 'Imported Scenario',
    slug: '',
    description: '',
    status: 'draft',
    nodes: sv.nodes ?? [],
    edges: sv.edges ?? [],
    startNodeId: sv.startNodeId ?? '',
    createdAt: now,
    updatedAt: now,
    thumbnailUrl: undefined,
    publishedVersion: undefined,
  }
}
