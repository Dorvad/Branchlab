import type { Scenario, ScenarioNode, ScenarioVersion, PlayerSessionState } from '@/types'

type ScenarioLike = Scenario | ScenarioVersion

function getScenarioId(scenario: ScenarioLike): string {
  if ('scenarioId' in scenario) return scenario.scenarioId
  return (scenario as Scenario).id
}

export function getStartNode(scenario: ScenarioLike): ScenarioNode {
  const node = scenario.nodes.find(n => n.id === scenario.startNodeId)
  if (!node) throw new Error(`Start node not found: ${scenario.startNodeId}`)
  return node
}

export function getNodeById(scenario: ScenarioLike, nodeId: string): ScenarioNode | undefined {
  return scenario.nodes.find(n => n.id === nodeId)
}

export function createSession(scenario: ScenarioLike): PlayerSessionState {
  return {
    scenarioId: getScenarioId(scenario),
    currentNodeId: scenario.startNodeId,
    history: [scenario.startNodeId],
    score: {},
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

  const newScore = { ...session.score }
  if (choice.scoreEffects) {
    for (const [key, value] of Object.entries(choice.scoreEffects)) {
      newScore[key] = (newScore[key] ?? 0) + value
    }
  }

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

export function getNodeTitle(scenario: ScenarioLike, nodeId: string): string {
  return getNodeById(scenario, nodeId)?.title ?? nodeId
}
