import type { Scenario, ScenarioNode, ValidationIssue, ValidationResult } from '@/types'

// ── Graph helpers ──────────────────────────────────────────────────────────────

/** BFS from startId; returns the set of all reachable node IDs. */
function findReachable(startId: string, nodeMap: Map<string, ScenarioNode>): Set<string> {
  const visited = new Set<string>()
  const queue = [startId]
  while (queue.length > 0) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    const node = nodeMap.get(id)
    if (node) {
      for (const c of node.choices) {
        if (c.targetNodeId && !visited.has(c.targetNodeId)) {
          queue.push(c.targetNodeId)
        }
      }
    }
  }
  return visited
}

/**
 * For every node in the graph, determines whether a path to at least one
 * ending node exists. Uses memoized DFS with a `visiting` set for cycle
 * detection (backtracking so sibling branches aren't falsely blocked).
 */
function buildCanReachEndingMap(nodes: ScenarioNode[]): Map<string, boolean> {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const memo = new Map<string, boolean>()

  function canReach(id: string, visiting: Set<string>): boolean {
    if (memo.has(id)) return memo.get(id)!
    const node = nodeMap.get(id)
    if (!node) { memo.set(id, false); return false }
    if (node.type === 'ending') { memo.set(id, true); return true }
    if (visiting.has(id)) return false // cycle — can't confirm from here

    visiting.add(id)
    let result = false
    for (const c of node.choices) {
      if (c.targetNodeId && canReach(c.targetNodeId, visiting)) {
        result = true
        break
      }
    }
    visiting.delete(id) // backtrack so sibling paths aren't blocked
    memo.set(id, result)
    return result
  }

  for (const n of nodes) canReach(n.id, new Set())
  return memo
}

// ── Issue constructors ─────────────────────────────────────────────────────────

let _seq = 0

function err(
  message: string,
  opts?: { nodeId?: string; choiceId?: string; suggestedFix?: string }
): ValidationIssue {
  return { id: `vld-${++_seq}`, severity: 'error', message, ...opts }
}

function warn(
  message: string,
  opts?: { nodeId?: string; choiceId?: string; suggestedFix?: string }
): ValidationIssue {
  return { id: `vld-${++_seq}`, severity: 'warning', message, ...opts }
}

// ── Main validator ─────────────────────────────────────────────────────────────

export function validateScenario(scenario: Scenario): ValidationResult {
  // Reset sequence per run so IDs are stable and short
  _seq = 0

  const issues: ValidationIssue[] = []
  const nodeMap = new Map(scenario.nodes.map(n => [n.id, n]))
  const nodeIds = new Set(scenario.nodes.map(n => n.id))

  // ── 1. Start node ────────────────────────────────────────────────────────────

  const startNodes = scenario.nodes.filter(n => n.type === 'start')

  if (startNodes.length === 0) {
    issues.push(err(
      'No start node. Every scenario needs exactly one node with type "Start".',
      { suggestedFix: 'Select a node and change its type to "Start" in the inspector.' }
    ))
  } else if (startNodes.length > 1) {
    for (const n of startNodes) {
      issues.push(err(
        `Multiple start nodes found (${startNodes.length} total). Only one is allowed.`,
        { nodeId: n.id, suggestedFix: 'Change extra start nodes to "Scene" type.' }
      ))
    }
  }

  if (!nodeIds.has(scenario.startNodeId)) {
    issues.push(err(
      `The scenario's startNodeId "${scenario.startNodeId}" does not match any node.`,
      { suggestedFix: 'This is a data inconsistency — re-save the scenario after setting a start node.' }
    ))
  }

  // ── 2. At least one ending ───────────────────────────────────────────────────

  if (!scenario.nodes.some(n => n.type === 'ending')) {
    issues.push(err(
      'No ending nodes. Players need at least one ending to complete the scenario.',
      { suggestedFix: 'Change a terminal node\'s type to "Ending".' }
    ))
  }

  // ── 3. Graph reachability & dead-end analysis ────────────────────────────────

  const hasValidStart = nodeIds.has(scenario.startNodeId)
  const reachable = hasValidStart
    ? findReachable(scenario.startNodeId, nodeMap)
    : new Set<string>()

  const canReachEnding = buildCanReachEndingMap(scenario.nodes)

  // ── 4. Per-node checks ───────────────────────────────────────────────────────

  for (const node of scenario.nodes) {
    const isEnding = node.type === 'ending'
    const label = node.title.trim() ? `"${node.title}"` : `(untitled node ${node.id.slice(-4)})`

    // Empty title
    if (!node.title.trim()) {
      issues.push(warn(`A node has no title.`, {
        nodeId: node.id,
        suggestedFix: 'Give this node a clear title so it\'s easy to identify.',
      }))
    }

    // No video clip
    if (!node.clip) {
      issues.push(warn(`${label} has no video clip attached.`, {
        nodeId: node.id,
        suggestedFix: 'Attach a video clip in the inspector. The scenario can still play without one.',
      }))
    }

    // Unreachable from start
    if (hasValidStart && !reachable.has(node.id)) {
      issues.push(warn(`${label} is unreachable — no path from the start node leads here.`, {
        nodeId: node.id,
        suggestedFix: 'Point a choice from another node to this one, or delete it.',
      }))
    }

    if (!isEnding) {
      if (node.choices.length === 0) {
        // No choices — dead-end is implicit, don't double-report
        issues.push(err(`${label} has no choices. Players will be stuck here.`, {
          nodeId: node.id,
          suggestedFix: 'Add at least one choice in the inspector, or change this node\'s type to "Ending".',
        }))
      } else {
        // Has choices but still can't reach an ending (e.g. all paths cycle back)
        if (!canReachEnding.get(node.id)) {
          issues.push(err(`${label} has no path to any ending — all routes loop back or dead-end.`, {
            nodeId: node.id,
            suggestedFix: 'Ensure at least one choice chain from this node eventually reaches an ending node.',
          }))
        }

        // Per-choice checks
        for (const choice of node.choices) {
          if (!choice.label.trim()) {
            issues.push(warn(`A choice on ${label} has no label.`, {
              nodeId: node.id,
              choiceId: choice.id,
              suggestedFix: 'Give this choice a label so players know what they\'re selecting.',
            }))
          }

          if (!choice.targetNodeId) {
            issues.push(err(
              `Choice "${choice.label || '(no label)'}" on ${label} has no destination.`,
              {
                nodeId: node.id,
                choiceId: choice.id,
                suggestedFix: 'Pick a destination node for this choice in the inspector.',
              }
            ))
          } else if (!nodeIds.has(choice.targetNodeId)) {
            issues.push(err(
              `Choice "${choice.label || '(no label)'}" on ${label} points to a deleted node.`,
              {
                nodeId: node.id,
                choiceId: choice.id,
                suggestedFix: 'Update or remove this choice — its destination no longer exists.',
              }
            ))
          }
        }
      }
    }
  }

  // ── Assemble result ───────────────────────────────────────────────────────────

  const errors = issues.filter(i => i.severity === 'error')
  const warnings = issues.filter(i => i.severity === 'warning')

  const nodeIssueMap: Record<string, ValidationIssue[]> = {}
  for (const issue of issues) {
    if (issue.nodeId) {
      nodeIssueMap[issue.nodeId] ??= []
      nodeIssueMap[issue.nodeId].push(issue)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    issues, // errors first, then warnings
    nodeIssueMap,
  }
}
