'use client'

import type { Scenario, ScenarioVersion, ScenarioNode } from '@/types'
import { exportToBlab, importFromBlab, blabToScenario } from './blab-format'
import { uploadClipFromBuffer } from './supabase/clips'
import { slugify } from './local-store'

type ScenarioLike = Scenario | ScenarioVersion

function isScenarioVersion(s: ScenarioLike): s is ScenarioVersion {
  return 'scenarioId' in s && 'publishedAt' in s
}

function getTitle(s: ScenarioLike): string {
  return ('title' in s ? s.title : undefined) ?? 'scenario'
}

function getSlug(s: ScenarioLike): string {
  return s.slug ?? slugify(getTitle(s))
}

function collectClipUrls(nodes: ScenarioNode[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const node of nodes) {
    if (node.clip?.url) {
      const url = node.clip.url
      const filename = url.split('/').pop() ?? `${node.clip.id}.mp4`
      map.set(url, filename)
    }
  }
  return map
}

function triggerDownload(data: Uint8Array, filename: string): void {
  const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export interface ZipExportOptions {
  onProgress?: (pct: number, label: string) => void
}

export async function exportToZip(
  scenario: ScenarioLike,
  opts?: ZipExportOptions,
): Promise<void> {
  const { zip, strToU8 } = await import('fflate')

  const nodes = scenario.nodes
  const urlToFilename = collectClipUrls(nodes)
  const urlEntries = [...urlToFilename.entries()]

  // Build scenario JSON (same format as .blab)
  const blabPayload = {
    format: 'blab',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    scenario: isScenarioVersion(scenario)
      ? scenario
      : {
          id: scenario.id,
          scenarioId: scenario.id,
          version: 1,
          title: (scenario as Scenario).title,
          nodes: scenario.nodes,
          edges: scenario.edges,
          startNodeId: scenario.startNodeId,
          publishedAt: (scenario as Scenario).updatedAt ?? new Date().toISOString(),
          slug: (scenario as Scenario).slug ?? slugify((scenario as Scenario).title),
        },
  }

  const files: Record<string, Uint8Array> = {
    'scenario.blab': strToU8(JSON.stringify(blabPayload, null, 2)),
  }

  // Fetch each video
  let fetched = 0
  for (const [url, filename] of urlEntries) {
    opts?.onProgress?.(Math.round((fetched / urlEntries.length) * 80), `Fetching ${filename}…`)
    try {
      const res = await fetch(url, { mode: 'cors' })
      if (res.ok) {
        const buf = await res.arrayBuffer()
        files[`videos/${filename}`] = new Uint8Array(buf)
      }
    } catch {
      // Skip videos that fail to fetch
    }
    fetched++
  }

  opts?.onProgress?.(90, 'Compressing…')

  const zipped = await new Promise<Uint8Array>((resolve, reject) => {
    zip(files, { level: 0 }, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })

  opts?.onProgress?.(100, 'Done')
  triggerDownload(zipped, `${getSlug(scenario)}.zip`)
}

export async function importFromZip(
  file: File,
  onProgress?: (pct: number, label: string) => void,
): Promise<Scenario> {
  const { unzip, strFromU8 } = await import('fflate')

  onProgress?.(5, 'Reading ZIP…')
  const buf = await file.arrayBuffer()
  const uint8 = new Uint8Array(buf)

  const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(uint8, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })

  // Find scenario.blab
  const blabFile = files['scenario.blab']
  if (!blabFile) throw new Error('Invalid ZIP: missing scenario.blab')

  onProgress?.(20, 'Parsing scenario…')
  const blabText = strFromU8(blabFile)
  const blabFileObj = new File([blabText], 'scenario.blab', { type: 'application/json' })
  const blab = await importFromBlab(blabFileObj)
  const draft = blabToScenario(blab)

  // Collect videos
  const videoEntries = Object.entries(files).filter(([path]) => path.startsWith('videos/'))
  if (videoEntries.length === 0) return draft

  // Build old URL → new URL map
  const oldUrlToNew = new Map<string, string>()
  let uploaded = 0

  for (const [path, data] of videoEntries) {
    const filename = path.replace('videos/', '')
    const pct = 20 + Math.round((uploaded / videoEntries.length) * 70)
    onProgress?.(pct, `Uploading ${filename}…`)

    // Determine mime type from extension
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'mp4'
    const mimeType = ext === 'webm' ? 'video/webm' : ext === 'mov' ? 'video/quicktime' : 'video/mp4'

    // Find which old URL this file corresponds to
    const matchingNode = blab.scenario.nodes.find(n => {
      if (!n.clip?.url) return false
      const urlFilename = n.clip.url.split('/').pop() ?? ''
      return urlFilename === filename
    })

    try {
      const clip = await uploadClipFromBuffer(data, filename, mimeType, matchingNode?.clip?.duration ?? 0)
      if (matchingNode?.clip?.url) {
        oldUrlToNew.set(matchingNode.clip.url, clip.url)
      }
    } catch {
      // Skip failed uploads
    }
    uploaded++
  }

  // Patch clip URLs in draft nodes
  draft.nodes = draft.nodes.map(node => {
    if (!node.clip?.url) return node
    const newUrl = oldUrlToNew.get(node.clip.url)
    if (!newUrl) return node
    return { ...node, clip: { ...node.clip, url: newUrl } }
  })

  onProgress?.(100, 'Done')
  return draft
}
