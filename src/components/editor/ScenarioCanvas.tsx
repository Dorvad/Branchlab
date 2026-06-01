'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
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
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
  type NodeChange,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AlertTriangle, Film, Maximize2, Crosshair, Flag } from 'lucide-react'
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
    border: 'var(--line-3)',
    bg: 'linear-gradient(180deg, var(--tint-2) 0%, rgba(255,255,255,0.01) 100%)',
    glow: '0 4px 24px rgba(0,0,0,0.45)',
    label: 'var(--fg-2)',
    dot: 'var(--fg-3)',
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

// ── Custom Edge ───────────────────────────────────────────────────────────────

interface ChoiceEdgeData {
  choiceLabel: string
  isHighlighted: boolean
  isEdgeSelected: boolean
  sourceNodeId: string
  choiceId: string
  onLabelEdit: (sourceNodeId: string, choiceId: string, label: string) => void
}

function ChoiceEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style, data, markerEnd,
}: EdgeProps) {
  const d = (data ?? {}) as unknown as ChoiceEdgeData
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 12,
  })

  const isActive = d.isEdgeSelected || d.isHighlighted

  const startEdit = useCallback(() => {
    setEditValue(d.choiceLabel)
    setEditing(true)
    setTimeout(() => { inputRef.current?.select() }, 0)
  }, [d.choiceLabel])

  const commitEdit = useCallback(() => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== d.choiceLabel) {
      d.onLabelEdit(d.sourceNodeId, d.choiceId, trimmed)
    }
    setEditing(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editValue, d.choiceLabel, d.sourceNodeId, d.choiceId])

  return (
    <>
      {/* Wide transparent hit area */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={18} style={{ cursor: 'pointer' }} />
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />

      {/* Label — always shown when selected or source-highlighted */}
      {(isActive || editing) && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 10,
            }}
          >
            {editing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
                  if (e.key === 'Escape') { e.preventDefault(); setEditing(false) }
                  e.stopPropagation()
                }}
                autoFocus
                style={{
                  background: 'var(--bg-1)',
                  border: '1px solid oklch(82% 0.18 165)',
                  color: 'var(--fg-0)',
                  fontSize: 10,
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  borderRadius: 8,
                  outline: 'none',
                  width: Math.max(80, editValue.length * 7 + 20),
                  maxWidth: 180,
                  boxShadow: '0 0 0 3px oklch(82% 0.18 165 / 0.15)',
                }}
              />
            ) : (
              <span
                onClick={d.isEdgeSelected ? startEdit : undefined}
                title={d.isEdgeSelected ? 'Click to rename' : undefined}
                style={{
                  background: d.isEdgeSelected
                    ? 'oklch(82% 0.18 165 / 0.12)'
                    : 'var(--bg-glass)',
                  border: `1px solid ${d.isEdgeSelected ? 'oklch(82% 0.18 165 / 0.5)' : 'var(--line-3)'}`,
                  color: isActive ? 'oklch(82% 0.18 165)' : 'var(--fg-2)',
                  fontSize: 9,
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  borderRadius: 8,
                  letterSpacing: '0.03em',
                  whiteSpace: 'nowrap',
                  maxWidth: 140,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                  cursor: d.isEdgeSelected ? 'text' : 'default',
                  userSelect: 'none',
                }}
              >
                {d.choiceLabel || 'New choice'}
              </span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

const EDGE_TYPES = { choiceEdge: ChoiceEdge }

// ── Custom node card ──────────────────────────────────────────────────────────

interface NodeCardData {
  title: string
  nodeType: NodeType
  choiceCount: number
  unconnectedChoiceCount: number
  errorLevel: 'error' | 'warning' | null
  hasClip: boolean
  isCheckpoint?: boolean
  checkpointLabel?: string
  clipDuration?: number
  isSelected: boolean
  thumbnailUrl?: string
}

function ScenarioNodeCard({ data }: NodeProps) {
  const d = data as unknown as NodeCardData
  const cfg = TYPE_CONFIG[d.nodeType] ?? TYPE_CONFIG.scene
  const isEnding = d.nodeType === 'ending'
  const isStart = d.nodeType === 'start'
  const [hovered, setHovered] = useState(false)

  const errorBorder = d.errorLevel === 'error'
    ? 'oklch(70% 0.18 25 / 0.8)'
    : d.errorLevel === 'warning'
    ? 'oklch(80% 0.16 60 / 0.6)'
    : null

  const activeBorder = d.isSelected
    ? 'oklch(82% 0.18 165 / 0.9)'
    : errorBorder ?? cfg.border

  const noChoicesWarning = !isEnding && d.choiceCount === 0 && !d.errorLevel

  const handleStyle: React.CSSProperties = {
    width: 10,
    height: 10,
    background: 'var(--bg-0)',
    border: '2px solid oklch(82% 0.18 165)',
    borderRadius: '50%',
    opacity: hovered ? 1 : 0,
    transform: hovered ? 'scale(1)' : 'scale(0.5)',
    transition: 'opacity 0.15s ease, transform 0.15s ease',
    cursor: 'crosshair',
    zIndex: 20,
  }

  return (
    <div
      style={{ width: 210 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Handle type="target" id="tgt-top"    position={Position.Top}    style={handleStyle} />
      <Handle type="target" id="tgt-right"  position={Position.Right}  style={handleStyle} />
      <Handle type="target" id="tgt-bottom" position={Position.Bottom} style={handleStyle} />
      <Handle type="target" id="tgt-left"   position={Position.Left}   style={handleStyle} />
      {!isEnding && (
        <>
          <Handle type="source" id="src-top"    position={Position.Top}    style={handleStyle} />
          <Handle type="source" id="src-right"  position={Position.Right}  style={handleStyle} />
          <Handle type="source" id="src-bottom" position={Position.Bottom} style={handleStyle} />
          <Handle type="source" id="src-left"   position={Position.Left}   style={handleStyle} />
        </>
      )}

      <div
        className="rounded-[13px] overflow-hidden select-none"
        style={{
          background: cfg.bg,
          border: `1px solid ${activeBorder}`,
          boxShadow: d.isSelected ? SELECTED_RING : cfg.glow,
          transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
          cursor: 'pointer',
        }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{
            height: 68,
            background: d.thumbnailUrl
              ? '#000'
              : d.hasClip
              ? `radial-gradient(ellipse 80% 60% at 50% 50%, ${cfg.dot}18 0%, transparent 70%), var(--bg-thumbnail)`
              : 'repeating-linear-gradient(135deg, var(--tint-1) 0 5px, transparent 5px 10px), var(--bg-thumbnail)',
            borderBottom: `1px solid ${d.isSelected ? 'oklch(82% 0.18 165 / 0.2)' : 'var(--line-1)'}`,
          }}
        >
          {d.thumbnailUrl && (
            <img src={d.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.75 }} />
          )}
          {d.thumbnailUrl && (
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%), radial-gradient(ellipse 80% 60% at 50% 50%, ${cfg.dot}20 0%, transparent 70%)` }} />
          )}
          {d.hasClip ? (
            <div className="relative z-10 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot, boxShadow: `0 0 5px ${cfg.dot}` }} />
              <span className="font-mono text-[10px]" style={{ color: d.thumbnailUrl ? 'rgba(255,255,255,0.9)' : cfg.label }}>clip attached</span>
            </div>
          ) : (
            <Film size={15} className="relative z-10" style={{ color: 'var(--fg-4)' }} />
          )}

          {d.clipDuration != null && (
            <span
              className="absolute right-2 bottom-1.5 font-mono text-[9px] tabular-nums px-1 py-0.5 rounded"
              style={{ background: 'rgba(0,0,0,0.5)', color: 'var(--fg-2)' }}
            >
              {Math.floor(d.clipDuration / 60)}:{String(d.clipDuration % 60).padStart(2, '0')}
            </span>
          )}

          {isStart && (
            <span
              className="absolute left-2 top-1.5 text-[8px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded-md"
              style={{ background: 'oklch(82% 0.18 165 / 0.15)', color: 'oklch(82% 0.18 165)', border: '1px solid oklch(82% 0.18 165 / 0.2)' }}
            >
              Entry
            </span>
          )}
        </div>

        <div className="px-3 pt-2.5 pb-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
              <span className="text-[9px] font-mono tracking-[0.14em] uppercase" style={{ color: cfg.label }}>
                {TYPE_LABELS[d.nodeType]}
              </span>
              {d.isCheckpoint && (
                <span
                  className="flex items-center gap-0.5 text-[8px] font-mono tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-md"
                  style={{
                    background: 'oklch(82% 0.18 165 / 0.12)',
                    border: '1px solid oklch(82% 0.18 165 / 0.25)',
                    color: 'oklch(82% 0.18 165)',
                  }}
                >
                  <Flag size={7} />
                  {d.checkpointLabel?.trim() || 'Checkpoint'}
                </span>
              )}
            </div>
            {d.errorLevel === 'error' && <AlertTriangle size={11} style={{ color: 'oklch(70% 0.18 25)' }} />}
            {d.errorLevel === 'warning' && <AlertTriangle size={11} style={{ color: 'oklch(80% 0.16 60)' }} />}
          </div>

          <p
            className="font-semibold leading-tight mb-2 line-clamp-2"
            style={{ fontSize: 12.5, color: d.title ? 'var(--fg-1)' : 'var(--fg-4)', fontStyle: d.title ? 'normal' : 'italic' }}
          >
            {d.title || 'Untitled'}
          </p>

          <div className="flex items-center gap-1.5">
            {isEnding ? (
              <span className="text-[9px] font-mono" style={{ color: cfg.label }}>Final outcome</span>
            ) : d.choiceCount > 0 ? (() => {
              const shown = Math.min(d.choiceCount, 4)
              const connectedCount = d.choiceCount - d.unconnectedChoiceCount
              return Array.from({ length: shown }, (_, i) => {
                const isUnconnected = i >= connectedCount
                return (
                  <span
                    key={i}
                    className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-mono font-medium"
                    style={isUnconnected
                      ? { background: 'oklch(80% 0.16 60 / 0.12)', color: 'oklch(80% 0.16 60 / 0.9)', border: '1px solid oklch(80% 0.16 60 / 0.35)' }
                      : { background: 'var(--tint-3)', color: 'var(--fg-3)', border: '1px solid var(--line-2)' }
                    }
                  >
                    {isUnconnected ? '?' : String.fromCharCode(65 + i)}
                  </span>
                )
              })
            })() : (
              <span
                className="text-[9px] font-mono"
                style={{ color: noChoicesWarning ? 'oklch(80% 0.16 60 / 0.7)' : 'var(--fg-4)' }}
              >
                {noChoicesWarning ? '⚠ no choices' : 'No choices'}
              </span>
            )}
            {d.choiceCount > 4 && (
              <span className="text-[9px] font-mono" style={{ color: 'var(--fg-4)' }}>+{d.choiceCount - 4}</span>
            )}
          </div>
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
      choiceCount: n.choices?.length ?? 0,
      unconnectedChoiceCount: n.choices?.filter(c => !c.targetNodeId).length ?? 0,
      errorLevel: nodeStatusMap[n.id] ?? null,
      hasClip: !!n.clip || !!n.youtubeAsset,
      thumbnailUrl: n.clip?.thumbnail ?? n.youtubeAsset?.thumbnailUrl,
      clipDuration: n.clip?.duration,
      isSelected: n.id === selectedNodeId,
      isCheckpoint: n.isCheckpoint,
      checkpointLabel: n.checkpointLabel,
    } satisfies NodeCardData,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  }))
}

function buildRFEdges(
  edges: ScenarioEdge[],
  selectedNodeId: string | null,
  selectedEdgeId: string | null,
  nodes: ScenarioNode[],
  onLabelEdit: (sourceNodeId: string, choiceId: string, label: string) => void,
): Edge[] {
  return edges.map(e => {
    const isHighlighted = e.sourceNodeId === selectedNodeId
    const isEdgeSelected = e.id === selectedEdgeId
    const sourceNode = nodes.find(n => n.id === e.sourceNodeId)
    const choice = sourceNode?.choices.find(c => c.id === e.choiceId)
    const strokeColor = isEdgeSelected
      ? 'oklch(82% 0.18 165)'
      : isHighlighted
      ? 'oklch(82% 0.18 165 / 0.65)'
      : 'var(--line-3)'
    const markerColor = isEdgeSelected || isHighlighted
      ? 'oklch(82% 0.18 165)'
      : 'var(--line-4)'
    return {
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      sourceHandle: e.sourceHandle || 'src-bottom',
      targetHandle: e.targetHandle || 'tgt-top',
      type: 'choiceEdge',
      data: {
        choiceLabel: choice?.label ?? '',
        isHighlighted,
        isEdgeSelected,
        sourceNodeId: e.sourceNodeId,
        choiceId: e.choiceId,
        onLabelEdit,
      } satisfies ChoiceEdgeData,
      reconnectable: true,
      style: {
        stroke: strokeColor,
        strokeWidth: isEdgeSelected ? 2.5 : isHighlighted ? 2 : 1.5,
        transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
      },
      markerEnd: {
        type: 'arrowclosed' as const,
        color: markerColor,
        width: 12,
        height: 12,
      },
    }
  })
}

// ── CanvasActions ─────────────────────────────────────────────────────────────

function CanvasActions({ startNodeId }: { startNodeId: string | null }) {
  const { fitView, getNode, setCenter } = useReactFlow()

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.18, duration: 450 })
  }, [fitView])

  const handleCenterStart = useCallback(() => {
    if (!startNodeId) return
    const node = getNode(startNodeId)
    if (node) setCenter(node.position.x + 105, node.position.y + 60, { zoom: 1, duration: 450 })
  }, [startNodeId, getNode, setCenter])

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
          background: 'var(--bg-glass)',
          border: '1px solid var(--line-2)',
          borderRadius: 10,
          padding: '3px',
          backdropFilter: 'blur(8px)',
        }}
      >
        <CanvasBtn onClick={handleFitView} title="Fit view (⌘⇧F)"><Maximize2 size={12} /></CanvasBtn>
        {startNodeId && (
          <CanvasBtn onClick={handleCenterStart} title="Center on start node"><Crosshair size={12} /></CanvasBtn>
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
      className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
      style={{ color: 'var(--fg-3)' }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg-1)'; e.currentTarget.style.background = 'var(--tint-3)' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-3)'; e.currentTarget.style.background = '' }}
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
  selectedEdgeId: string | null
  onSelectNode: (id: string | null) => void
  onSelectEdge: (id: string | null) => void
  onNodePositionChange: (id: string, position: { x: number; y: number }) => void
  nodeStatusMap: Record<string, 'error' | 'warning'>
  startNodeId?: string
  onConnect: (sourceNodeId: string, targetNodeId: string, sourceHandle: string, targetHandle: string) => void
  onEdgeLabelEdit: (sourceNodeId: string, choiceId: string, label: string) => void
  onEdgeReconnect: (edgeId: string, newTargetNodeId: string, newTargetHandle: string) => void
}

export function ScenarioCanvas({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  onNodePositionChange,
  nodeStatusMap,
  startNodeId,
  onConnect,
  onEdgeLabelEdit,
  onEdgeReconnect,
}: ScenarioCanvasProps) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>(
    buildRFNodes(nodes, selectedNodeId, nodeStatusMap)
  )
  const [rfEdges, setRfEdges] = useEdgesState<Edge>(
    buildRFEdges(edges, selectedNodeId, selectedEdgeId, nodes, onEdgeLabelEdit)
  )

  useEffect(() => {
    setRfNodes(buildRFNodes(nodes, selectedNodeId, nodeStatusMap))
  }, [nodes, selectedNodeId, nodeStatusMap, setRfNodes])

  useEffect(() => {
    setRfEdges(buildRFEdges(edges, selectedNodeId, selectedEdgeId, nodes, onEdgeLabelEdit))
  // onEdgeLabelEdit is stable (useCallback), safe to include
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges, selectedNodeId, selectedEdgeId, nodes])

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => onNodesChange(changes),
    [onNodesChange]
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectNode(node.id)
      onSelectEdge(null)
    },
    [onSelectNode, onSelectEdge]
  )

  const onPaneClick = useCallback(() => {
    onSelectNode(null)
    onSelectEdge(null)
  }, [onSelectNode, onSelectEdge])

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => onNodePositionChange(node.id, node.position),
    [onNodePositionChange]
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        onConnect(
          connection.source,
          connection.target,
          connection.sourceHandle ?? 'src-bottom',
          connection.targetHandle ?? 'tgt-top',
        )
      }
    },
    [onConnect]
  )

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      onSelectEdge(edge.id)
      onSelectNode(null)
    },
    [onSelectEdge, onSelectNode]
  )

  const handleReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (newConnection.target) {
        onEdgeReconnect(
          oldEdge.id,
          newConnection.target,
          newConnection.targetHandle ?? 'tgt-top',
        )
      }
    },
    [onEdgeReconnect]
  )

  const resolvedStartNodeId = startNodeId ?? nodes.find(n => n.type === 'start')?.id ?? null

  return (
    <div className="relative w-full h-full">
      {nodes.length === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-4 max-w-xs text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--tint-1)', border: '1px dashed var(--line-2)' }}
            >
              <Film size={22} style={{ color: 'var(--fg-4)' }} />
            </div>
            <div>
              <p className="text-sm font-medium text-ink-2 mb-1">No scenes yet</p>
              <p className="text-[12px] text-ink-4 leading-relaxed">
                Click <span className="text-ink-3 font-medium">Add Scene</span> in the sidebar to create your first scene, then connect them with choices.
              </p>
            </div>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={handleNodesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        onConnect={handleConnect}
        onEdgeClick={handleEdgeClick}
        onReconnect={handleReconnect}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.15}
        maxZoom={2.5}
        connectionRadius={40}
        connectionLineStyle={{
          stroke: 'oklch(82% 0.18 165 / 0.6)',
          strokeWidth: 2,
          strokeDasharray: '6 4',
        }}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={null}
        style={{ background: 'var(--bg-canvas)' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="var(--tint-2)"
          gap={24}
          size={1.5}
        />
        <Controls showInteractive={false} style={{ bottom: 12, left: 12 }} />
        <MiniMap
          nodeColor={n => {
            const t = (n.data as unknown as NodeCardData).nodeType
            return TYPE_CONFIG[t]?.dot ?? 'var(--fg-4)'
          }}
          maskColor="rgba(8,9,13,0.85)"
          style={{ bottom: 12, right: 12 }}
        />
        <CanvasActions startNodeId={resolvedStartNodeId} />
      </ReactFlow>
    </div>
  )
}
