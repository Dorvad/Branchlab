'use client'

import { useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Scenario } from '@/types'

const NODE_COLORS = {
  start: { border: 'oklch(82% 0.18 165 / 0.7)', bg: 'oklch(82% 0.18 165 / 0.1)', label: 'oklch(82% 0.18 165)', tag: 'START' },
  scene: { border: 'rgba(255,255,255,0.18)', bg: 'rgba(255,255,255,0.03)', label: '#c9cdda', tag: 'SCENE' },
  feedback: { border: 'oklch(78% 0.18 285 / 0.6)', bg: 'oklch(78% 0.18 285 / 0.1)', label: 'oklch(78% 0.18 285)', tag: 'FEEDBACK' },
  ending: { border: 'oklch(80% 0.16 60 / 0.6)', bg: 'oklch(80% 0.16 60 / 0.1)', label: 'oklch(80% 0.16 60)', tag: 'ENDING' },
}

function ScenarioNodeCard({ data }: NodeProps) {
  const d = data as { title: string; nodeType: string; choiceCount: number }
  const colors = NODE_COLORS[d.nodeType as keyof typeof NODE_COLORS] ?? NODE_COLORS.scene

  return (
    <div
      className="rounded-[10px] overflow-hidden min-w-[160px]"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* mock video thumbnail */}
      <div
        className="h-16 flex items-center justify-center text-[10px] font-mono tracking-widest uppercase"
        style={{
          background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 6px, transparent 6px 12px), #0c0e14',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          color: '#5c6273',
        }}
      >
        video
      </div>
      <div className="p-3">
        <p className="text-xs font-semibold text-ink-1 leading-tight mb-1">{d.title}</p>
        <p className="font-mono text-[9px] tracking-widest uppercase" style={{ color: colors.label }}>
          {colors.tag}
          {d.choiceCount > 0 && ` · ${d.choiceCount} choice${d.choiceCount !== 1 ? 's' : ''}`}
        </p>
      </div>
    </div>
  )
}

const nodeTypes = { scenarioNode: ScenarioNodeCard }

interface ScenarioCanvasProps {
  scenario: Scenario
}

export function ScenarioCanvas({ scenario }: ScenarioCanvasProps) {
  const nodes: Node[] = scenario.nodes.map(n => ({
    id: n.id,
    position: n.position,
    data: { title: n.title, nodeType: n.type, choiceCount: n.choices.length },
    type: 'scenarioNode',
  }))

  const edges: Edge[] = scenario.edges.map(e => ({
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    animated: false,
    style: { stroke: 'rgba(255,255,255,0.18)', strokeWidth: 1.5 },
    markerEnd: { type: 'arrowclosed' as const, color: 'rgba(255,255,255,0.3)' },
  }))

  const onInit = useCallback(() => {}, [])

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={onInit}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="rgba(255,255,255,0.06)" gap={24} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            const t = (n.data as { nodeType: string }).nodeType
            if (t === 'start') return '#5ef5a8'
            if (t === 'ending') return '#f5c76e'
            if (t === 'feedback') return '#a78bfa'
            return '#3a3f4e'
          }}
          maskColor="rgba(8,9,13,0.8)"
        />
      </ReactFlow>
    </div>
  )
}
