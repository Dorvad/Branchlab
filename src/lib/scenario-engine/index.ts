import type {
  Scenario,
  ScenarioNode,
  ScenarioChoice,
  ScenarioVersion,
  ScenarioLike,
  PlayerSessionState,
  ScoreEffects,
} from '@/types'

export type { CheckpointState } from '@/types'

export type { ScenarioLike }
export { validateScenario } from './validation'

function getScenarioId(scenario: ScenarioLike): string {
  if ('scenarioId' in scenario) return scenario.scenarioId
  return (scenario as Scenario).id
}

// ─── Node access ────────────────────────────────────────────────────────────

export function getStartNode(scenario: ScenarioLike): ScenarioNode {
  const node = scenario.nodes.find(n => n.id === scenario.startNodeId)
  if (!node) throw new Error(`Start node not found: ${scenario.startNodeId}`)
  return node
}

export function getNodeById(scenario: ScenarioLike, nodeId: string): ScenarioNode | undefined {
  return scenario.nodes.find(n => n.id === nodeId)
}

export function getNodeTitle(scenario: ScenarioLike, nodeId: string): string {
  return getNodeById(scenario, nodeId)?.title ?? nodeId
}

// ─── Score helpers ───────────────────────────────────────────────────────────

export function applyScoreEffects(
  score: Record<string, number>,
  effects?: ScoreEffects
): Record<string, number> {
  if (!effects) return score
  const next = { ...score }
  for (const [key, delta] of Object.entries(effects)) {
    next[key] = (next[key] ?? 0) + delta
  }
  return next
}

// ─── Choice access ───────────────────────────────────────────────────────────

export function getAvailableChoices(scenario: ScenarioLike, nodeId: string): ScenarioChoice[] {
  return getNodeById(scenario, nodeId)?.choices ?? []
}

// ─── Node type checks ────────────────────────────────────────────────────────

export function isEndingNode(scenario: ScenarioLike, nodeId: string): boolean {
  return getNodeById(scenario, nodeId)?.type === 'ending'
}

// ─── Session management ──────────────────────────────────────────────────────

export function createSession(scenario: ScenarioLike): PlayerSessionState {
  // Fall back to the first node in the array if startNodeId is missing or stale.
  const startNodeId =
    (scenario.startNodeId && getNodeById(scenario, scenario.startNodeId))
      ? scenario.startNodeId
      : scenario.nodes[0]?.id ?? ''

  const startNode = getNodeById(scenario, startNodeId)
  const initialScore = applyScoreEffects({}, startNode?.scoreEffects)

  return {
    scenarioId: getScenarioId(scenario),
    currentNodeId: startNodeId,
    history: [startNodeId],
    score: initialScore,
    startedAt: new Date().toISOString(),
  }
}

export function restartFromCheckpoint(
  session: PlayerSessionState,
  scenario: ScenarioLike,
): PlayerSessionState {
  const cp = session.latestCheckpoint
  if (!cp) return createSession(scenario)

  const cpNode = getNodeById(scenario, cp.nodeId)
  if (!cpNode) return createSession(scenario)

  return {
    ...session,
    currentNodeId: cp.nodeId,
    history: session.history.slice(0, cp.pathIndex + 1),
    completedAt: undefined,
    endingNodeId: undefined,
    // preserve latestCheckpoint and score so the player keeps context
  }
}

export function advanceSession(
  session: PlayerSessionState,
  scenario: ScenarioLike,
  choiceId: string
): PlayerSessionState {
  const currentNode = getNodeById(scenario, session.currentNodeId)
  if (!currentNode) return session

  const choice = currentNode.choices.find(c => c.id === choiceId)
  if (!choice) return session

  const nextNode = getNodeById(scenario, choice.targetNodeId)
  if (!nextNode) return session

  // Apply choice's score effects, then destination node's score effects
  let newScore = applyScoreEffects(session.score, choice.scoreEffects)
  newScore = applyScoreEffects(newScore, nextNode.scoreEffects)

  const isEnding = nextNode.type === 'ending'

  return {
    ...session,
    currentNodeId: choice.targetNodeId,
    history: [...session.history, choice.targetNodeId],
    score: newScore,
    completedAt: isEnding ? new Date().toISOString() : undefined,
    endingNodeId: isEnding ? choice.targetNodeId : undefined,
  }
}
