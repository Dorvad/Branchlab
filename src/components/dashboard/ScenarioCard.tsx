'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { GitBranch, Eye, ArrowRight, Clock, Copy, Trash2, Globe } from 'lucide-react'
import type { Scenario } from '@/types'

interface ScenarioCardProps {
  scenario: Scenario
  index?: number
  onDuplicate?: () => void
  onDelete?: () => void
}

const STATUS_STYLES = {
  published: {
    label: 'Published',
    dot: 'var(--neon-mint)',
    text: 'oklch(82% 0.18 165)',
    border: 'oklch(82% 0.18 165 / 0.3)',
    bg: 'oklch(82% 0.18 165 / 0.08)',
  },
  draft: {
    label: 'Draft',
    dot: '#8a90a4',
    text: '#8a90a4',
    border: 'rgba(255,255,255,0.12)',
    bg: 'rgba(255,255,255,0.03)',
  },
  archived: {
    label: 'Archived',
    dot: '#5c6273',
    text: '#5c6273',
    border: 'rgba(255,255,255,0.08)',
    bg: 'rgba(255,255,255,0.02)',
  },
}

export function ScenarioCard({ scenario, index = 0, onDuplicate, onDelete }: ScenarioCardProps) {
  const style = STATUS_STYLES[scenario.status]
  const nodeCount = scenario.nodes.length
  const endingCount = scenario.nodes.filter(n => n.type === 'ending').length
  const updatedDate = new Date(scenario.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  const pub = scenario.publishedVersion
  const hasDraftChanges = pub && new Date(scenario.updatedAt) > new Date(pub.publishedAt)
  const publishedDate = pub
    ? new Date(pub.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="group rounded-2xl border overflow-hidden flex flex-col"
      style={{
        background: 'rgba(17,20,28,0.7)',
        borderColor: 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Thumbnail area */}
      <div
        className="relative h-40 flex items-center justify-center overflow-hidden"
        style={{
          background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.02) 0 6px, transparent 6px 12px), #0c0e14',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <svg width="48" height="48" viewBox="0 0 44 44" fill="none" className="opacity-20">
          <circle cx="10" cy="22" r="5" fill="white" />
          <circle cx="34" cy="10" r="4" fill="white" />
          <circle cx="34" cy="34" r="4" fill="white" />
          <path d="M14 22 L30 12 M14 22 L30 32" stroke="white" strokeWidth="1.5" />
        </svg>
        {/* Status pill */}
        <div
          className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono tracking-widest uppercase"
          style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.text }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: style.dot }} />
          {style.label}
        </div>

        {/* Draft changes badge */}
        {hasDraftChanges && (
          <div
            className="absolute bottom-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider"
            style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.12)', color: '#8a90a4' }}
          >
            draft changes
          </div>
        )}

        {/* Hover actions (duplicate / delete) */}
        {(onDuplicate || onDelete) && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onDuplicate && (
              <button
                onClick={e => { e.preventDefault(); onDuplicate() }}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                style={{ background: 'rgba(0,0,0,0.5)', color: '#8a90a4' }}
                title="Duplicate"
              >
                <Copy size={12} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={e => { e.preventDefault(); onDelete() }}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:text-red-400"
                style={{ background: 'rgba(0,0,0,0.5)', color: '#8a90a4' }}
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col gap-4 flex-1">
        <div>
          <h3 className="font-semibold text-ink-0 mb-1.5 leading-snug">{scenario.title}</h3>
          <p className="text-sm text-ink-2 leading-relaxed line-clamp-2">
            {scenario.description || <span className="italic text-ink-4">No description</span>}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs font-mono text-ink-3">
          <span className="flex items-center gap-1.5">
            <GitBranch size={12} />
            {nodeCount} nodes
          </span>
          <span>{endingCount} endings</span>
          {pub ? (
            <span className="flex items-center gap-1.5 ml-auto" title={`Published ${publishedDate} · v${pub.version}`}>
              <Globe size={11} />
              v{pub.version} · {publishedDate}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 ml-auto">
              <Clock size={11} />
              {updatedDate}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 mt-auto border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <Link
            href={`/editor/${scenario.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-medium border transition-all hover:bg-white/5"
            style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#c9cdda' }}
          >
            Edit
          </Link>
          <Link
            href={`/preview/${scenario.id}`}
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl text-sm font-medium border transition-all hover:bg-white/5"
            style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#c9cdda' }}
          >
            <Eye size={13} />
            Preview
          </Link>
          {pub && (
            <Link
              href={`/play/${pub.slug}`}
              className="flex items-center gap-1.5 py-2 px-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: 'oklch(82% 0.18 165 / 0.12)',
                color: 'var(--neon-mint)',
                border: '1px solid oklch(82% 0.18 165 / 0.25)',
              }}
            >
              <ArrowRight size={13} />
              Play
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  )
}
