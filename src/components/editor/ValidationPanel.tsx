'use client'

import { X, CheckCircle2, AlertTriangle, AlertCircle, ArrowRight, Lightbulb } from 'lucide-react'
import type { ValidationResult, ValidationIssue } from '@/types'

interface ValidationPanelProps {
  result: ValidationResult
  onClose: () => void
  onSelectNode?: (nodeId: string) => void
}

export function ValidationPanel({ result, onClose, onSelectNode }: ValidationPanelProps) {
  const { valid, errors, warnings } = result
  const totalIssues = errors.length + warnings.length

  const headerColor = valid
    ? 'oklch(82% 0.18 165)'
    : errors.length > 0
    ? 'oklch(70% 0.18 25)'
    : 'oklch(80% 0.16 60)'

  const headerLabel = valid
    ? 'Scenario is valid'
    : errors.length > 0
    ? `${errors.length} error${errors.length !== 1 ? 's' : ''}${warnings.length > 0 ? ` · ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}` : ''}`
    : `${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-[480px] rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: '#0e0f16',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          maxHeight: 'min(680px, 90vh)',
        }}
      >
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 h-[52px] shrink-0 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2.5">
            {valid ? (
              <CheckCircle2 size={15} style={{ color: headerColor }} />
            ) : errors.length > 0 ? (
              <AlertCircle size={15} style={{ color: headerColor }} />
            ) : (
              <AlertTriangle size={15} style={{ color: headerColor }} />
            )}
            <span className="text-sm font-medium" style={{ color: headerColor }}>
              {headerLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-ink-3 hover:text-ink-1 transition-colors p-1"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {valid ? (
            <div
              className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
              style={{
                background: 'oklch(82% 0.18 165 / 0.07)',
                border: '1px solid oklch(82% 0.18 165 / 0.2)',
              }}
            >
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: 'oklch(82% 0.18 165)' }} />
              <span className="text-[12px] leading-relaxed" style={{ color: 'oklch(82% 0.18 165)' }}>
                All nodes are reachable, every non-ending node has choices with valid destinations, and at least one ending exists.
              </span>
            </div>
          ) : (
            <>
              {errors.length > 0 && (
                <IssueSection
                  label="Errors"
                  count={errors.length}
                  issues={errors}
                  accentColor="oklch(70% 0.18 25)"
                  onSelectNode={onSelectNode}
                  onClose={onClose}
                />
              )}
              {warnings.length > 0 && (
                <IssueSection
                  label="Warnings"
                  count={warnings.length}
                  issues={warnings}
                  accentColor="oklch(80% 0.16 60)"
                  onSelectNode={onSelectNode}
                  onClose={onClose}
                />
              )}
            </>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div
          className="shrink-0 px-5 py-3 border-t flex items-center justify-between"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        >
          {!valid && (
            <span className="text-[10px] font-mono text-ink-4">
              {totalIssues} issue{totalIssues !== 1 ? 's' : ''} · errors block publishing
            </span>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 rounded-xl text-xs font-mono transition-all hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#8a90a4' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── IssueSection ──────────────────────────────────────────────────────────────

interface IssueSectionProps {
  label: string
  count: number
  issues: ValidationIssue[]
  accentColor: string
  onSelectNode?: (nodeId: string) => void
  onClose: () => void
}

function IssueSection({ label, count, issues, accentColor, onSelectNode, onClose }: IssueSectionProps) {
  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="text-[9px] font-mono tracking-[0.18em] uppercase"
          style={{ color: accentColor }}
        >
          {label}
        </span>
        <span
          className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
          style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}30` }}
        >
          {count}
        </span>
        <div className="flex-1 h-px" style={{ background: `${accentColor}20` }} />
      </div>

      {/* Issue list */}
      <div className="space-y-2">
        {issues.map(issue => (
          <IssueCard
            key={issue.id}
            issue={issue}
            accentColor={accentColor}
            onSelectNode={onSelectNode}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  )
}

// ── IssueCard ─────────────────────────────────────────────────────────────────

interface IssueCardProps {
  issue: ValidationIssue
  accentColor: string
  onSelectNode?: (nodeId: string) => void
  onClose: () => void
}

function IssueCard({ issue, accentColor, onSelectNode, onClose }: IssueCardProps) {
  const canJump = !!issue.nodeId && !!onSelectNode

  const handleJump = () => {
    if (issue.nodeId && onSelectNode) {
      onSelectNode(issue.nodeId)
      onClose()
    }
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: `${accentColor}08`,
        border: `1px solid ${accentColor}25`,
      }}
    >
      <div className="flex items-start gap-2.5 px-3.5 pt-3 pb-2.5">
        <AlertTriangle
          size={12}
          className="mt-0.5 shrink-0"
          style={{ color: accentColor }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] leading-relaxed" style={{ color: '#c9cdda' }}>
            {issue.message}
          </p>

          {issue.suggestedFix && (
            <div className="flex items-start gap-1.5 mt-2">
              <Lightbulb size={10} className="mt-0.5 shrink-0" style={{ color: '#5c6273' }} />
              <p className="text-[10px] leading-relaxed" style={{ color: '#5c6273' }}>
                {issue.suggestedFix}
              </p>
            </div>
          )}
        </div>
      </div>

      {canJump && (
        <div className="px-3.5 pb-2.5 flex justify-end">
          <button
            onClick={handleJump}
            className="flex items-center gap-1 text-[10px] font-mono transition-opacity hover:opacity-80"
            style={{ color: accentColor }}
          >
            Jump to node
            <ArrowRight size={10} />
          </button>
        </div>
      )}
    </div>
  )
}
