import type {
  Scenario,
  ScenarioNode,
  ScenarioChoice,
  ScenarioVersion,
  ScenarioLike,
  PlayerSessionState,
  ScoreEffects,
  ValidationResult,
  ValidationIssue,
} from '@/types'

export type { ScenarioLike }

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

// ─── Validation ──────────────────────────────────────────────────────────────

export function validatePlayableScenario(scenario: ScenarioLike): ValidationResult {
  const issues: ValidationIssue[] = []
  const nodeIds = new Set(scenario.nodes.map(n => n.id))

  if (!nodeIds.has(scenario.startNodeId)) {
    issues.push({
      nodeId: scenario.startNodeId,
      message: `Start node "${scenario.startNodeId}" does not exist`,
    })
  }

  for (const node of scenario.nodes) {
    for (const choice of node.choices) {
      if (!nodeIds.has(choice.targetNodeId)) {
        issues.push({
          nodeId: node.id,
          message: `Choice "${choice.label}" points to missing node "${choice.targetNodeId}"`,
        })
      }
    }

    if (node.type !== 'ending' && node.choices.length === 0) {
      issues.push({
        nodeId: node.id,
        message: `Node "${node.title}" has no choices — players will be stuck here`,
      })
    }
  }

  return { valid: issues.length === 0, issues }
}

// ─── Session management ──────────────────────────────────────────────────────

export function createSession(scenario: ScenarioLike): PlayerSessionState {
  // Apply the start node's own scoreEffects on entry
  const startNode = getNodeById(scenario, scenario.startNodeId)
  const initialScore = applyScoreEffects({}, startNode?.scoreEffects)

  return {
    scenarioId: getScenarioId(scenario),
    currentNodeId: scenario.startNodeId,
    history: [scenario.startNodeId],
    score: initialScore,
    startedAt: new Date().toISOString(),
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
