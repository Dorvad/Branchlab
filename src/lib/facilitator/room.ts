// Pure helpers for turning raw session/vote/participant rows into the shapes
// the host control room and participant screen render. No I/O — keeps the
// tally math testable and shared between both UIs.

import { getNodeById } from '@/lib/scenario-engine'
import type { ScenarioVersion } from '@/types'
import type { FacilitatorVote, FacilitatorVoteTally } from '@/types/facilitator'

export function tallyVotes(
  version: ScenarioVersion,
  nodeId: string | null,
  votes: FacilitatorVote[]
): { tallies: FacilitatorVoteTally[]; totalVotes: number } {
  if (!nodeId) return { tallies: [], totalVotes: 0 }

  const node = getNodeById(version, nodeId)
  if (!node) return { tallies: [], totalVotes: 0 }

  const nodeVotes = votes.filter(v => v.nodeId === nodeId)
  const totalVotes = nodeVotes.length

  const counts = new Map<string, number>()
  for (const v of nodeVotes) counts.set(v.choiceId, (counts.get(v.choiceId) ?? 0) + 1)

  const tallies: FacilitatorVoteTally[] = node.choices.map(choice => {
    const count = counts.get(choice.id) ?? 0
    return {
      choiceId: choice.id,
      label: choice.label,
      targetNodeId: choice.targetNodeId,
      count,
      percentage: totalVotes > 0 ? (count / totalVotes) * 100 : 0,
    }
  })

  return { tallies: tallies.sort((a, b) => b.count - a.count), totalVotes }
}

export function majorityChoiceId(tallies: FacilitatorVoteTally[]): string | null {
  if (tallies.length === 0) return null
  const top = tallies[0]
  if (top.count === 0) return null
  // Tie at the top → no single majority to highlight
  const tiedWithTop = tallies.filter(t => t.count === top.count)
  if (tiedWithTop.length > 1) return null
  return top.choiceId
}
