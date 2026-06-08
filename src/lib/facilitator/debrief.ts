// Deterministic discussion prompts for the host's debrief panel — built from
// the actual scene, vote distribution, and any choice feedback text already
// authored in the editor. No external AI calls (per spec Step 9).

import type { ScenarioNode, ScenarioChoice } from '@/types'
import type { FacilitatorVoteTally } from '@/types/facilitator'

export interface DebriefPrompt {
  id: string
  text: string
}

export function buildDebriefPrompts(
  node: ScenarioNode,
  tallies: FacilitatorVoteTally[],
  totalVotes: number
): DebriefPrompt[] {
  const prompts: DebriefPrompt[] = []
  const ranked = [...tallies].sort((a, b) => b.count - a.count)
  const top = ranked[0]
  const second = ranked[1]
  const isSplit = top && second && top.count > 0 && top.count === second.count
  const isUnanimous = top && totalVotes > 0 && top.count === totalVotes

  prompts.push({ id: 'reaction', text: `What stood out to you about "${node.title}"?` })

  if (totalVotes === 0) {
    prompts.push({ id: 'no-votes', text: 'No votes were cast here — what made this scene harder to react to?' })
  } else if (isUnanimous) {
    prompts.push({ id: 'unanimous', text: `Everyone who voted picked "${top.label}". What made that option feel like the obvious choice?` })
  } else if (isSplit) {
    prompts.push({ id: 'split', text: `The group was evenly split between "${top.label}" and "${second.label}". What does that tell us about how people read this scene differently?` })
  } else if (top) {
    prompts.push({ id: 'majority', text: `${Math.round(top.percentage)}% chose "${top.label}" — what do you think made that the most popular option?` })
  }

  if (second && second.count > 0) {
    prompts.push({ id: 'alternative', text: `What might have happened if the group had gone with "${second.label}" instead?` })
  }

  prompts.push({ id: 'personal', text: 'If you were the one making this call, what would you have done — and why?' })
  prompts.push({ id: 'assumptions', text: 'What assumptions or beliefs might be behind each of these options?' })
  prompts.push({ id: 'stakes', text: 'Who is affected by this decision, and how might they each see it differently?' })
  prompts.push({ id: 'reallife', text: 'Has anyone faced a real situation like this one? What did you do?' })

  // Feedback text authored on individual choices — show as discussion material rather than a prompt.
  const withFeedback = node.choices.filter((c): c is ScenarioChoice & { feedback: string } => !!c.feedback?.trim())
  if (withFeedback.length > 0) {
    prompts.push({
      id: 'feedback',
      text: `Consider the feedback written for these choices: ${withFeedback.map(c => `"${c.label}" → ${c.feedback}`).join('  •  ')}`,
    })
  }

  return prompts
}
