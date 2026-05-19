'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Eye, Globe, List, X } from 'lucide-react'
import { ScenarioCanvas } from './ScenarioCanvas'
import type { Scenario } from '@/types'

const NODE_TYPE_COLORS = {
  start: 'oklch(82% 0.18 165)',
  scene: '#8a90a4',
  feedback: 'oklch(78% 0.18 285)',
  ending: 'oklch(80% 0.16 60)',
}

interface EditorShellProps {
  scenario: Scenario
}

export function EditorShell({ scenario }: EditorShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex flex-col h-screen bg-bg-1 overflow-hidden">
      {/* Top toolbar */}
      <header
        className="flex items-center justify-between px-4 py-3 border-b shrink-0 z-10"
        style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(8,9,13,0.9)', backdropFilter: 'blur(16px)' }}
      >
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink-0 transition-colors"
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>/</span>
          <span className="text-sm font-medium text-ink-0 truncate max-w-[240px]">{scenario.title}</span>
          <StatusPill status={scenario.status} />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all hover:bg-white/5"
            style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#8a90a4' }}
          >
            <List size={14} />
            <span className="hidden sm:inline">Nodes</span>
          </button>
          <Link
            href={`/preview/${scenario.id}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all hover:bg-white/5"
            style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#c9cdda' }}
          >
            <Eye size={14} />
            Preview
          </Link>
          {scenario.status === 'published' ? (
            <Link
              href={`/play/${scenario.slug}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all"
              style={{
                background: 'oklch(82% 0.18 165 / 0.12)',
                color: 'var(--neon-mint)',
                border: '1px solid oklch(82% 0.18 165 / 0.25)',
              }}
            >
              <Globe size={14} />
              View live
            </Link>
          ) : (
            <button
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:brightness-110"
              style={{
                background: 'var(--neon-mint)',
                color: '#052916',
                boxShadow: 'var(--glow-mint)',
              }}
              onClick={() => alert('Publish — coming soon!')}
            >
              <Globe size={14} />
              Publish
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Canvas */}
        <div className="flex-1 h-full">
          <ScenarioCanvas scenario={scenario} />
        </div>

        {/* Node sidebar */}
        {sidebarOpen && (
          <motion.aside
            initial={{ x: 280 }}
            animate={{ x: 0 }}
            exit={{ x: 280 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-0 bottom-0 w-72 border-l overflow-y-auto z-20"
            style={{
              background: 'rgba(11,13,19,0.95)',
              borderColor: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-ink-3 tracking-widest uppercase">
                  Nodes · {scenario.nodes.length}
                </span>
                <button onClick={() => setSidebarOpen(false)} className="text-ink-3 hover:text-ink-1 transition-colors">
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-2">
                {scenario.nodes.map(node => (
                  <div
                    key={node.id}
                    className="p-3 rounded-xl border"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderColor: 'rgba(255,255,255,0.07)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm text-ink-1 font-medium leading-snug">{node.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[9px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full"
                        style={{
                          color: NODE_TYPE_COLORS[node.type],
                          background: `${NODE_TYPE_COLORS[node.type]}18`,
                          border: `1px solid ${NODE_TYPE_COLORS[node.type]}40`,
                        }}
                      >
                        {node.type}
                      </span>
                      {node.choices.length > 0 && (
                        <span className="text-[10px] text-ink-3 font-mono">
                          {node.choices.length} choice{node.choices.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.aside>
        )}
      </div>

      {/* Bottom stats bar */}
      <div
        className="flex items-center gap-6 px-5 py-2.5 border-t shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(8,9,13,0.7)' }}
      >
        {[
          { label: 'Nodes', value: scenario.nodes.length },
          { label: 'Edges', value: scenario.edges.length },
          { label: 'Endings', value: scenario.nodes.filter(n => n.type === 'ending').length },
          { label: 'Start', value: scenario.nodes.find(n => n.type === 'start')?.title ?? '—' },
        ].map(stat => (
          <div key={stat.label} className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-ink-3 tracking-wider uppercase">{stat.label}</span>
            <span className="text-[11px] font-mono text-ink-1">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const styles = {
    published: { color: 'oklch(82% 0.18 165)', bg: 'oklch(82% 0.18 165 / 0.1)', border: 'oklch(82% 0.18 165 / 0.3)', dot: 'oklch(82% 0.18 165)' },
    draft: { color: '#8a90a4', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', dot: '#8a90a4' },
    archived: { color: '#5c6273', bg: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.07)', dot: '#5c6273' },
  }
  const s = styles[status as keyof typeof styles] ?? styles.draft

  return (
    <span
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono tracking-widest uppercase"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {status}
    </span>
  )
}
