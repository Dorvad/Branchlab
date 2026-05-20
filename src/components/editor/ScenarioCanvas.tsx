'use client'

import { useEffect, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  BackgroundVariant,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AlertTriangle, Film, Maximize2, Crosshair } from 'lucide-react'
import type { ScenarioNode, ScenarioEdge, NodeType } from '@/types'

// ── Design tokens ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<NodeType, { border: string; bg: string; glow: string; label: string; dot: string }> = {
  start: {
    border: 'oklch(82% 0.18 165 / 0.8)',
    bg: 'linear-gradient(180deg, oklch(82% 0.18 165 / 0.12) 0%, oklch(82% 0.18 165 / 0.04) 100%)',
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
    bg: 'linear-gradient(180deg, oklch(78% 0.18 285 / 0.12) 0%, oklch(78% 0.18 285 / 0.04) 100%)',
    glow: '0 0 0 1px oklch(78% 0.18 285 / 0.2), 0 8px 32px rgba(0,0,0,0.5)',
    label: 'oklch(78% 0.18 285)',
    dot: '#a78bfa',
  },
  ending: {
    border: 'oklch(80% 0.16 60 / 0.7)',
    bg: 'linear-gradient(180deg, oklch(80% 0.16 60 / 0.12) 0%, oklch(80% 0.16 60 / 0.04) 100%)',
    glow: '0 0 0 1px oklch(80% 0.16 60 / 0.2), 0 8px 32px rgba(0,0,0,0.5)',
    label: 'oklch(80% 0.16 60)',
    dot: '#f5c76e',
  },
}

const SELECTED_RING = '0 0 0 2px oklch(82% 0.18 165 / 0.8), 0 0 0 5px oklch(82% 0.18 165 / 0.12), 0 8px 32px rgba(0,0,0,0.6)'

const TYPE_LABELS: Record<NodeType, string> = {
  start: 'Start',
  scene: 'Scene',
  feedback: 'Feedback',
  ending: 'Ending',
}

// ── Custom node card ──────────────────────────────────────────────────────────

interface NodeCardData {
  title: string
  nodeType: NodeType
  choiceCount: number
  errorLevel: 'error' | 'warning' | null
  hasClip: boolean
  clipDuration?: number
  isSelected: boolean
}

function ScenarioNodeCard({ data }: NodeProps) {
  const d = data as unknown as NodeCardData
  const cfg = TYPE_CONFIG[d.nodeType] ?? TYPE_CONFIG.scene
  const isEnding = d.nodeType === 'ending'
  const isStart = d.nodeType === 'start'

  const errorBorder = d.errorLevel === 'error'
    ? 'oklch(70% 0.18 25 / 0.8)'
    : d.errorLevel === 'warning'
    ? 'oklch(80% 0.16 60 / 0.6)'
    : null

  const activeBorder = d.isSelected
    ? 'oklch(82% 0.18 165 / 0.9)'
    : errorBorder ?? cfg.border

  const noChoicesWarning = !isEnding && d.choiceCount === 0 && !d.errorLevel

  return (
    <div
      className="relative rounded-[13px] overflow-hidden select-none"
      style={{
        width: 210,
        background: cfg.bg,
        border: `1px solid ${activeBorder}`,
        boxShadow: d.isSelected ? SELECTED_RING : cfg.glow,
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
        cursor: 'pointer',
      }}
    >
      {/* Handles (invisible) */}
      {!isEnding && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ opacity: 0, width: 10, height: 10, bottom: -5 }}
        />
      )}
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, width: 10, height: 10, top: -5 }}
      />

      {/* Thumbnail area */}
      <div
        className="relative flex items-center justify-center"
        style={{
          height: 68,
          background: d.hasClip
            ? `radial-gradient(ellipse 80% 60% at 50% 50%, ${cfg.dot}18 0%, transparent 70%), #0b0d13`
            : 'repeating-linear-gradient(135deg, rgba(255,255,255,0.02) 0 5px, transparent 5px 10px), #0b0d13',
          borderBottom: `1px solid ${d.isSelected ? 'oklch(82% 0.18 165 / 0.2)' : 'rgba(255,255,255,0.06)'}`,
        }}
      >
        {d.hasClip ? (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot, boxShadow: `0 0 5px ${cfg.dot}` }} />
            <span className="font-mono text-[10px]" style={{ color: cfg.label }}>clip attached</span>
          </div>
        ) : (
          <Film size={15} style={{ color: '#2a2f3e' }} />
        )}

        {/* Clip duration badge */}
        {d.clipDuration != null && (
          <span
            className="absolute right-2 bottom-1.5 font-mono text-[9px] tabular-nums px-1 py-0.5 rounded"
            style={{ background: 'rgba(0,0,0,0.5)', color: '#8a90a4' }}
          >
            {Math.floor(d.clipDuration / 60)}:{String(d.clipDuration % 60).padStart(2, '0')}
          </span>
        )}

        {/* Start badge */}
        {isStart && (
          <span
            className="absolute left-2 top-1.5 text-[8px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded-md"
            style={{ background: 'oklch(82% 0.18 165 / 0.15)', color: 'oklch(82% 0.18 165)', border: '1px solid oklch(82% 0.18 165 / 0.2)' }}
          >
            Entry
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-3 pt-2.5 pb-2">
        {/* Type badge row */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
            <span className="text-[9px] font-mono tracking-[0.14em] uppercase" style={{ color: cfg.label }}>
              {TYPE_LABELS[d.nodeType]}
            </span>
          </div>
          {d.errorLevel === 'error' && (
            <AlertTriangle size={11} style={{ color: 'oklch(70% 0.18 25)' }} />
          )}
          {d.errorLevel === 'warning' && (
            <AlertTriangle size={11} style={{ color: 'oklch(80% 0.16 60)' }} />
          )}
        </div>

        {/* Title */}
        <p
          className="font-semibold leading-tight mb-2 line-clamp-2"
          style={{ fontSize: 12.5, color: d.title ? '#e8eaf0' : '#3a3f4e', fontStyle: d.title ? 'normal' : 'italic' }}
        >
          {d.title || 'Untitled'}
        </p>

        {/* Footer */}
        <div className="flex items-center gap-1.5">
          {isEnding ? (
            <span className="text-[9px] font-mono" style={{ color: cfg.label }}>Final outcome</span>
          ) : d.choiceCount > 0 ? (
            Array.from({ length: Math.min(d.choiceCount, 4) }, (_, i) => (
              <span
                key={i}
                className="w-3.5 h-3.5 rounded flex items-center justify-center text-[8px] font-mono font-medium"
                style={{ background: 'rgba(255,255,255,0.07)', color: '#5c6273', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {String.fromCharCode(65 + i)}
              </span>
            ))
          ) : (
            <span
              className="text-[9px] font-mono"
              style={{ color: noChoicesWarning ? 'oklch(80% 0.16 60 / 0.7)' : '#3a3f4e' }}
            >
              {noChoicesWarning ? '⚠ no choices' : 'No choices'}
            </span>
          )}
          {d.choiceCount > 4 && (
            <span className="text-[9px] font-mono" style={{ color: '#3a3f4e' }}>+{d.choiceCount - 4}</span>
          )}
        </div>
      </div>
    </div>
  )
}

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
      hasClip: !!n.clip,
      clipDuration: n.clip?.duration,
      isSelected: n.id === selectedNodeId,
    } satisfies NodeCardData,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  }))
}

function buildRFEdges(edges: ScenarioEdge[], selectedNodeId: string | null): Edge[] {
  return edges.map(e => {
    const isHighlighted = e.sourceNodeId === selectedNodeId
    return {
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      type: 'smoothstep',
      style: {
        stroke: isHighlighted ? 'oklch(82% 0.18 165 / 0.65)' : 'rgba(255,255,255,0.13)',
        strokeWidth: isHighlighted ? 2 : 1.5,
        transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
      },
      markerEnd: {
        type: 'arrowclosed' as const,
        color: isHighlighted ? 'oklch(82% 0.18 165 / 0.65)' : 'rgba(255,255,255,0.22)',
        width: 12,
        height: 12,
      },
    }
  })
}

// ── CanvasActions — uses ReactFlow context (must be inside <ReactFlow>) ───────

function CanvasActions({ startNodeId }: { startNodeId: string | null }) {
  const { fitView, getNode, setCenter } = useReactFlow()

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.18, duration: 450 })
  }, [fitView])

  const handleCenterStart = useCallback(() => {
    if (!startNodeId) return
    const node = getNode(startNodeId)
    if (node) {
      setCenter(node.position.x + 105, node.position.y + 60, { zoom: 1, duration: 450 })
    }
  }, [startNodeId, getNode, setCenter])

  // Keyboard shortcut: Ctrl/Cmd+Shift+F to fit view
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        handleFitView()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleFitView])

  return (
    <Panel position="bottom-right" style={{ bottom: 52, right: 12 }}>
      <div
        className="flex gap-1"
        style={{
          background: 'rgba(9,9,14,0.9)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10,
          padding: '3px',
          backdropFilter: 'blur(8px)',
        }}
      >
        <CanvasBtn onClick={handleFitView} title="Fit view (⌘⇧F)">
          <Maximize2 size={12} />
        </CanvasBtn>
        {startNodeId && (
          <CanvasBtn onClick={handleCenterStart} title="Center on start node">
            <Crosshair size={12} />
          </CanvasBtn>
        )}
      </div>
    </Panel>
  )
}

function CanvasBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-white/8"
      style={{ color: '#5c6273' }}
      onMouseEnter={e => { e.currentTarget.style.color = '#c9cdda'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.color = '#5c6273'; e.currentTarget.style.background = '' }}
    >
      {children}
    </button>
  )
}

// ── Canvas component ──────────────────────────────────────────────────────────

interface ScenarioCanvasProps {
  nodes: ScenarioNode[]
  edges: ScenarioEdge[]
  selectedNodeId: string | null
  onSelectNode: (id: string | null) => void
  onNodePositionChange: (id: string, position: { x: number; y: number }) => void
  nodeStatusMap: Record<string, 'error' | 'warning'>
  startNodeId?: string
}

export function ScenarioCanvas({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onNodePositionChange,
  nodeStatusMap,
  startNodeId,
}: ScenarioCanvasProps) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>(
    buildRFNodes(nodes, selectedNodeId, nodeStatusMap)
  )
  const [rfEdges, setRfEdges] = useEdgesState<Edge>(
    buildRFEdges(edges, selectedNodeId)
  )

  useEffect(() => {
    setRfNodes(buildRFNodes(nodes, selectedNodeId, nodeStatusMap))
  }, [nodes, selectedNodeId, nodeStatusMap, setRfNodes])

  useEffect(() => {
    setRfEdges(buildRFEdges(edges, selectedNodeId))
  }, [edges, selectedNodeId, setRfEdges])

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => { onNodesChange(changes) },
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

  const resolvedStartNodeId = startNodeId ?? nodes.find(n => n.type === 'start')?.id ?? null

  return (
    <div className="relative w-full h-full">
      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          <div
            className="flex flex-col items-center gap-4 max-w-xs text-center"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}
            >
              <Film size={22} style={{ color: '#3a3f4e' }} />
            </div>
            <div>
              <p className="text-sm font-medium text-ink-2 mb-1">No scenes yet</p>
              <p className="text-[12px] text-ink-4 leading-relaxed">
                Click <span className="text-ink-3 font-medium">Add Node</span> in the sidebar to create your first scene, then connect them with choices.
              </p>
            </div>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={NODE_TYPES}
        onNodesChange={handleNodesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.15}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={null}
        style={{ background: '#0c0e14' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="rgba(255,255,255,0.05)"
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
          maskColor="rgba(8,9,13,0.85)"
          style={{ bottom: 12, right: 12 }}
        />
        <CanvasActions startNodeId={resolvedStartNodeId} />
      </ReactFlow>
    </div>
  )
}
