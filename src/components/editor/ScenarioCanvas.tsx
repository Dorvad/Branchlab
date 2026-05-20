'use client'

import { useEffect, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AlertTriangle, Film } from 'lucide-react'
import type { ScenarioNode, ScenarioEdge, NodeType } from '@/types'

// ── Design tokens ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<NodeType, { border: string; bg: string; glow: string; label: string; dot: string }> = {
  start: {
    border: 'oklch(82% 0.18 165 / 0.8)',
    bg: 'linear-gradient(180deg, oklch(82% 0.18 165 / 0.10) 0%, oklch(82% 0.18 165 / 0.04) 100%)',
    glow: '0 0 0 1px oklch(82% 0.18 165 / 0.25), 0 8px 32px rgba(0,0,0,0.5)',
    label: 'oklch(82% 0.18 165)',
    dot: '#5ef5a8',
  },
  scene: {
    border: 'rgba(255,255,255,0.14)',
    bg: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
    glow: '0 4px 24px rgba(0,0,0,0.45)',
    label: '#8a90a4',
    dot: '#5c6273',
  },
  feedback: {
    border: 'oklch(78% 0.18 285 / 0.65)',
    bg: 'linear-gradient(180deg, oklch(78% 0.18 285 / 0.10) 0%, oklch(78% 0.18 285 / 0.04) 100%)',
    glow: '0 0 0 1px oklch(78% 0.18 285 / 0.2), 0 8px 32px rgba(0,0,0,0.5)',
    label: 'oklch(78% 0.18 285)',
    dot: '#a78bfa',
  },
  ending: {
    border: 'oklch(80% 0.16 60 / 0.7)',
    bg: 'linear-gradient(180deg, oklch(80% 0.16 60 / 0.10) 0%, oklch(80% 0.16 60 / 0.04) 100%)',
    glow: '0 0 0 1px oklch(80% 0.16 60 / 0.2), 0 8px 32px rgba(0,0,0,0.5)',
    label: 'oklch(80% 0.16 60)',
    dot: '#f5c76e',
  },
}

const SELECTED_RING = '0 0 0 2px oklch(82% 0.18 165 / 0.7), 0 0 0 4px oklch(82% 0.18 165 / 0.15), 0 8px 32px rgba(0,0,0,0.5)'

// ── Custom node card ──────────────────────────────────────────────────────────
// Must be defined at module level so the reference is stable across renders.

interface NodeCardData {
  title: string
  nodeType: NodeType
  choiceCount: number
  errorLevel: 'error' | 'warning' | null
  clipDuration?: number
  isSelected: boolean
}

function ScenarioNodeCard({ data }: NodeProps) {
  const d = data as unknown as NodeCardData
  const cfg = TYPE_CONFIG[d.nodeType] ?? TYPE_CONFIG.scene
  const isEnding = d.nodeType === 'ending'
  const isStart = d.nodeType === 'start'

  const TYPE_LABELS: Record<NodeType, string> = {
    start: 'Start',
    scene: 'Scene',
    feedback: 'Feedback',
    ending: 'Ending',
  }

  const errorBorder = d.errorLevel === 'error'
    ? 'oklch(70% 0.18 25 / 0.7)'
    : d.errorLevel === 'warning'
    ? 'oklch(80% 0.16 60 / 0.5)'
    : null

  const activeBorder = d.isSelected
    ? 'oklch(82% 0.18 165 / 0.8)'
    : errorBorder ?? cfg.border

  return (
    <div
      className="relative rounded-[12px] overflow-hidden select-none"
      style={{
        width: 200,
        background: cfg.bg,
        border: `1px solid ${activeBorder}`,
        boxShadow: d.isSelected ? SELECTED_RING : cfg.glow,
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
    >
      {/* Handles (hidden; just needed for edge routing) */}
      {!isEnding && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ opacity: 0, width: 8, height: 8, bottom: -4 }}
        />
      )}
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, width: 8, height: 8, top: -4 }}
      />

      {/* Thumbnail */}
      <div
        className="relative h-[60px] flex items-center justify-center"
        style={{
          background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 5px, transparent 5px 10px), #0b0d13',
          borderBottom: `1px solid ${cfg.border}`,
        }}
      >
        <Film size={16} style={{ color: '#3a3f4e' }} />
        {d.clipDuration != null && (
          <span
            className="absolute right-2 bottom-1.5 font-mono text-[9px] tabular-nums"
            style={{ color: '#5c6273' }}
          >
            0:{String(d.clipDuration).padStart(2, '0')}
          </span>
        )}
        {isStart && (
          <span
            className="absolute left-2 top-1.5 text-[8px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded"
            style={{ background: 'oklch(82% 0.18 165 / 0.15)', color: 'oklch(82% 0.18 165)' }}
          >
            Entry
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-3 py-2.5">
        {/* Type badge + error/warning icon */}
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[9px] font-mono tracking-[0.16em] uppercase"
            style={{ color: cfg.label }}
          >
            {TYPE_LABELS[d.nodeType]}
          </span>
          {d.errorLevel === 'error' && (
            <AlertTriangle size={11} style={{ color: 'oklch(70% 0.18 25)', flexShrink: 0 }} />
          )}
          {d.errorLevel === 'warning' && (
            <AlertTriangle size={11} style={{ color: 'oklch(80% 0.16 60)', flexShrink: 0 }} />
          )}
        </div>

        {/* Title */}
        <p
          className="font-medium leading-tight mb-1.5 line-clamp-2"
          style={{ fontSize: 12, color: d.title ? '#e8eaf0' : '#5c6273' }}
        >
          {d.title || 'Untitled'}
        </p>

        {/* Footer */}
        <p className="font-mono text-[9px]" style={{ color: '#5c6273' }}>
          {isEnding
            ? 'Final outcome'
            : d.choiceCount === 0
            ? 'No choices yet'
            : `${d.choiceCount} choice${d.choiceCount !== 1 ? 's' : ''}`}
        </p>
      </div>
    </div>
  )
}

// Stable reference — defined once at module level
const NODE_TYPES = { scenarioNode: ScenarioNodeCard }

// ── Helper converters ─────────────────────────────────────────────────────────

function buildRFNodes(
  nodes: ScenarioNode[],
  selectedNodeId: string | null,
  nodeStatusMap: Record<string, 'error' | 'warning'>
): Node[] {
  return nodes.map(n => ({
    id: n.id,
    position: n.position,
    type: 'scenarioNode',
    data: {
      title: n.title,
      nodeType: n.type,
      choiceCount: n.choices.length,
      errorLevel: nodeStatusMap[n.id] ?? null,
      clipDuration: n.clip?.duration,
      isSelected: n.id === selectedNodeId,
    } satisfies NodeCardData,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  }))
}

function buildRFEdges(edges: ScenarioEdge[]): Edge[] {
  return edges.map(e => ({
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    type: 'smoothstep',
    style: { stroke: 'rgba(255,255,255,0.18)', strokeWidth: 1.5 },
    markerEnd: {
      type: 'arrowclosed' as const,
      color: 'rgba(255,255,255,0.3)',
      width: 12,
      height: 12,
    },
  }))
}

// ── Canvas component ──────────────────────────────────────────────────────────

interface ScenarioCanvasProps {
  nodes: ScenarioNode[]
  edges: ScenarioEdge[]
  selectedNodeId: string | null
  onSelectNode: (id: string | null) => void
  onNodePositionChange: (id: string, position: { x: number; y: number }) => void
  nodeStatusMap: Record<string, 'error' | 'warning'>
}

export function ScenarioCanvas({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onNodePositionChange,
  nodeStatusMap,
}: ScenarioCanvasProps) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>(
    buildRFNodes(nodes, selectedNodeId, nodeStatusMap)
  )
  const [rfEdges, setRfEdges] = useEdgesState<Edge>(buildRFEdges(edges))

  // Sync node data when scenario state changes from editor
  useEffect(() => {
    setRfNodes(buildRFNodes(nodes, selectedNodeId, nodeStatusMap))
  }, [nodes, selectedNodeId, nodeStatusMap, setRfNodes])

  // Sync edges when choices change
  useEffect(() => {
    setRfEdges(buildRFEdges(edges))
  }, [edges, setRfEdges])

  // Intercept node changes: only pass non-position changes to RF
  // (position is managed via onNodeDragStop to keep scenario in sync)
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes)
    },
    [onNodesChange]
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => onSelectNode(node.id),
    [onSelectNode]
  )

  const onPaneClick = useCallback(() => onSelectNode(null), [onSelectNode])

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodePositionChange(node.id, node.position)
    },
    [onNodePositionChange]
  )

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={NODE_TYPES}
        onNodesChange={handleNodesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.2}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={null} // disable RF's own delete — editor manages this
        style={{ background: '#0c0e14' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="rgba(255,255,255,0.055)"
          gap={24}
          size={1.5}
        />
        <Controls
          showInteractive={false}
          style={{ bottom: 12, left: 12 }}
        />
        <MiniMap
          nodeColor={n => {
            const t = (n.data as unknown as NodeCardData).nodeType
            return TYPE_CONFIG[t]?.dot ?? '#3a3f4e'
          }}
          maskColor="rgba(8,9,13,0.82)"
          style={{ bottom: 12, right: 12 }}
        />
      </ReactFlow>
    </div>
  )
}
