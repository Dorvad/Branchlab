import type { CheckpointState } from '@/types'

function storageKey(scenarioId: string): string {
  return `branchlab:scenario:${scenarioId}:latestCheckpoint`
}

export function saveCheckpointToStorage(scenarioId: string, checkpoint: CheckpointState): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(storageKey(scenarioId), JSON.stringify(checkpoint))
  } catch {}
}

export function loadCheckpointFromStorage(scenarioId: string): CheckpointState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(storageKey(scenarioId))
    if (!raw) return null
    return JSON.parse(raw) as CheckpointState
  } catch {
    return null
  }
}

export function clearCheckpointFromStorage(scenarioId: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(storageKey(scenarioId))
  } catch {}
}
