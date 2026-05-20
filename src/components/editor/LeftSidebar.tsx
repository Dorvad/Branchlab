'use client'

import { Plus, Film, GitBranch } from 'lucide-react'
import type { Scenario, NodeType } from '@/types'

const TYPE_DOT: Record<NodeType, string> = {
  start:    'oklch(82% 0.18 165)',
  scene:    '#5c6273',
  feedback: 'oklch(78% 0.18 285)',
  ending:   'oklch(80% 0.16 60)',
}

interface LeftSidebarProps {
  scenario: Scenario
  selectedNodeId: string | null
  onSelectNode: (id: string | null) => void
  onAddNode: () => void
}

export function LeftSidebar({ scenario, selectedNodeId, onSelectNode, onAddNode }: LeftSidebarProps) {
  // Collect all unique clips from this scenario
  const clips = scenario.nodes
    .filter(n => n.clip)
    .map(n => ({ ...n.clip!, nodeTitle: n.title }))

  const startNode = scenario.nodes.find(n => n.type === 'start')
  const endingCount = scenario.nodes.filter(n => n.type === 'ending').length
  const warnCount = scenario.nodes.filter(n => n.type !== 'ending' && n.choices.length === 0).length

  return (
    <aside
      className="flex flex-col w-[240px] shrink-0 border-r overflow-hidden"
      style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#09090e' }}
    >
      <div className="flex-1 overflow-y-auto">

        {/* ── Scenario header ──────────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <p className="text-xs font-semibold text-ink-0 leading-snug mb-1 line-clamp-2">
            {scenario.title}
          </p>
          {scenario.description && (
            <p className="text-[11px] text-ink-3 leading-relaxed line-clamp-2 mb-2">
              {scenario.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            <StatChip label={`${scenario.nodes.length} nodes`} />
            <StatChip label={`${endingCount} endings`} />
            {warnCount > 0 && (
              <StatChip
                label={`${warnCount} incomplete`}
                color="oklch(80% 0.16 60)"
              />
            )}
          </div>
        </div>

        {/* ── Node list ────────────────────────────────────────────────────── */}
        <div className="px-3 pt-3 pb-2">
          <SectionLabel>Nodes</SectionLabel>
          <div className="space-y-0.5 mt-2">
            {scenario.nodes.map(node => {
              const isSelected = node.id === selectedNodeId
              const dot = TYPE_DOT[node.type]
              const hasWarning = node.type !== 'ending' && node.choices.length === 0

              return (
                <button
                  key={node.id}
                  onClick={() => onSelectNode(node.id)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors group"
                  style={{
                    background: isSelected ? 'rgba(255,255,255,0.06)' : undefined,
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.background = ''
                  }}
                >
                  {/* Type dot */}
                  <span
                    className="shrink-0 w-1.5 h-1.5 rounded-full"
                    style={{
                      background: dot,
                      boxShadow: isSelected ? `0 0 6px ${dot}` : undefined,
                    }}
                  />
                  {/* Title */}
                  <span
                    className="flex-1 text-[12px] leading-snug truncate"
                    style={{ color: isSelected ? '#f5f6fa' : '#8a90a4' }}
                  >
                    {node.title}
                  </span>
                  {/* Warning dot */}
                  {hasWarning && (
                    <span
                      className="shrink-0 w-1.5 h-1.5 rounded-full"
                      style={{ background: 'oklch(80% 0.16 60)' }}
                    />
                  )}
                  {/* Choice count */}
                  {node.choices.length > 0 && !hasWarning && (
                    <span className="shrink-0 font-mono text-[9px]" style={{ color: '#3a3f4e' }}>
                      {node.choices.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Asset library ────────────────────────────────────────────────── */}
        <div className="px-3 pt-2 pb-3 mt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <SectionLabel>Assets</SectionLabel>
          {clips.length === 0 ? (
            <p className="text-[11px] text-ink-4 mt-2 px-1">No clips attached</p>
          ) : (
            <div className="space-y-0.5 mt-2">
              {clips.map(clip => (
                <div
                  key={clip.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <Film size={11} style={{ color: '#5c6273', flexShrink: 0 }} />
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] text-ink-3 truncate">
                      {clip.url.split('/').pop()}
                    </p>
                    <p className="font-mono text-[9px]" style={{ color: '#3a3f4e' }}>
                      {clip.nodeTitle} · {clip.duration}s
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Graph stats ──────────────────────────────────────────────────── */}
        {startNode && (
          <div className="px-3 pb-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2 mt-3">
              <GitBranch size={12} style={{ color: '#5c6273' }} />
              <span className="text-[11px] text-ink-3">
                Entry: <span className="text-ink-1">{startNode.title}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Add node button ───────────────────────────────────────────────── */}
      <div className="shrink-0 p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <button
          onClick={onAddNode}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all hover:brightness-110 active:scale-[0.98]"
          style={{
            background: 'oklch(82% 0.18 165 / 0.1)',
            borderColor: 'oklch(82% 0.18 165 / 0.3)',
            color: 'oklch(82% 0.18 165)',
          }}
        >
          <Plus size={14} />
          Add Node
        </button>
      </div>
    </aside>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-mono text-ink-4 tracking-[0.18em] uppercase">
      {children}
    </p>
  )
}

function StatChip({ label, color }: { label: string; color?: string }) {
  return (
    <span
      className="text-[10px] font-mono px-2 py-0.5 rounded-full"
      style={{
        background: color ? `${color}14` : 'rgba(255,255,255,0.05)',
        border: `1px solid ${color ? `${color}30` : 'rgba(255,255,255,0.07)'}`,
        color: color ?? '#5c6273',
      }}
    >
      {label}
    </span>
  )
}
