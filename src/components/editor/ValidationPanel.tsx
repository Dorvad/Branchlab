'use client'

import { X, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'
import type { ValidationResult } from '@/types'

interface ValidationPanelProps {
  result: ValidationResult
  onClose: () => void
}

export function ValidationPanel({ result, onClose }: ValidationPanelProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-[440px] rounded-2xl overflow-hidden"
        style={{
          background: '#0e0f16',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 h-[52px] border-b"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2.5">
            {result.valid ? (
              <CheckCircle2 size={15} style={{ color: 'oklch(82% 0.18 165)' }} />
            ) : (
              <AlertCircle size={15} style={{ color: 'oklch(70% 0.18 25)' }} />
            )}
            <span className="text-sm font-medium" style={{ color: result.valid ? 'oklch(82% 0.18 165)' : 'oklch(70% 0.18 25)' }}>
              {result.valid ? 'Scenario is valid' : `${result.issues.length} issue${result.issues.length !== 1 ? 's' : ''} found`}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-ink-3 hover:text-ink-1 transition-colors p-1"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {result.valid ? (
            <div
              className="flex items-start gap-3 px-4 py-3.5 rounded-xl text-sm"
              style={{
                background: 'oklch(82% 0.18 165 / 0.07)',
                border: '1px solid oklch(82% 0.18 165 / 0.2)',
                color: 'oklch(82% 0.18 165)',
              }}
            >
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
              <span className="text-[12px] leading-relaxed">
                All nodes are reachable, all choices have valid destinations, and every non-ending node has at least one choice.
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {result.issues.map((issue, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 px-3.5 py-3 rounded-xl"
                  style={{
                    background: 'oklch(70% 0.18 25 / 0.07)',
                    border: '1px solid oklch(70% 0.18 25 / 0.2)',
                  }}
                >
                  <AlertTriangle
                    size={12}
                    className="mt-0.5 shrink-0"
                    style={{ color: 'oklch(70% 0.18 25)' }}
                  />
                  <div className="min-w-0">
                    {issue.nodeId && (
                      <p
                        className="font-mono text-[9px] tracking-widest uppercase mb-1"
                        style={{ color: 'oklch(70% 0.18 25 / 0.7)' }}
                      >
                        node: {issue.nodeId}
                      </p>
                    )}
                    <p className="text-[12px] leading-relaxed" style={{ color: '#c9cdda' }}>
                      {issue.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 border-t flex justify-end"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono transition-all hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#8a90a4' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
