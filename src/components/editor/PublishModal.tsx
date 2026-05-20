'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, CheckCircle2, AlertTriangle, AlertCircle,
  Globe, Copy, ExternalLink, ChevronDown, ChevronUp,
} from 'lucide-react'
import { slugify, validateSlug } from '@/lib/local-store'
import type { Scenario, ValidationResult } from '@/types'

interface PublishModalProps {
  scenario: Scenario
  validationResult: ValidationResult
  onPublish: (slug: string) => void
  onClose: () => void
}

type ModalStep = 'form' | 'success'

export function PublishModal({
  scenario,
  validationResult,
  onPublish,
  onClose,
}: PublishModalProps) {
  const isRepublish = !!scenario.publishedVersion
  const { errors, warnings } = validationResult

  const [step, setStep] = useState<ModalStep>('form')
  const [publishedSlug, setPublishedSlug] = useState('')

  // Slug state
  const [slug, setSlug] = useState(() =>
    scenario.publishedVersion?.slug ?? slugify(scenario.title)
  )
  const [slugError, setSlugError] = useState<string | null>(null)
  const [showWarnings, setShowWarnings] = useState(false)
  const [copied, setCopied] = useState(false)

  // Validate slug on every change
  useEffect(() => {
    setSlugError(validateSlug(slug, scenario.id))
  }, [slug, scenario.id])

  const canPublish = errors.length === 0 && !slugError && slug.length >= 2
  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/play/${slug}`
    : `/play/${slug}`

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Enforce slug character set as the user types
    const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSlug(cleaned)
  }

  const handlePublish = () => {
    if (!canPublish) return
    onPublish(slug)
    setPublishedSlug(slug)
    setStep('success')
  }

  const handleCopy = useCallback(async () => {
    const url = `${window.location.origin}/play/${publishedSlug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked — silently fail
    }
  }, [publishedSlug])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-[460px] rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: '#0e0f16',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
          maxHeight: 'min(680px, 90vh)',
        }}
      >
        {step === 'form' ? (
          <FormStep
            scenario={scenario}
            isRepublish={isRepublish}
            errors={errors}
            warnings={warnings}
            slug={slug}
            slugError={slugError}
            showWarnings={showWarnings}
            canPublish={canPublish}
            onSlugChange={handleSlugChange}
            onToggleWarnings={() => setShowWarnings(v => !v)}
            onPublish={handlePublish}
            onClose={onClose}
          />
        ) : (
          <SuccessStep
            scenario={scenario}
            slug={publishedSlug}
            publicUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/play/${publishedSlug}`}
            copied={copied}
            onCopy={handleCopy}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}

// ── FormStep ──────────────────────────────────────────────────────────────────

interface FormStepProps {
  scenario: Scenario
  isRepublish: boolean
  errors: ReturnType<typeof Array.prototype.filter>
  warnings: ReturnType<typeof Array.prototype.filter>
  slug: string
  slugError: string | null
  showWarnings: boolean
  canPublish: boolean
  onSlugChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onToggleWarnings: () => void
  onPublish: () => void
  onClose: () => void
}

function FormStep({
  scenario, isRepublish, errors, warnings, slug, slugError,
  showWarnings, canPublish, onSlugChange, onToggleWarnings, onPublish, onClose,
}: FormStepProps) {
  const hasErrors = errors.length > 0
  const hasWarnings = warnings.length > 0

  return (
    <>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 h-[52px] shrink-0 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-2.5">
          <Globe size={14} style={{ color: hasErrors ? 'oklch(70% 0.18 25)' : '#8a90a4' }} />
          <span className="text-sm font-medium text-ink-0">
            {isRepublish ? 'Republish scenario' : 'Publish scenario'}
          </span>
        </div>
        <button onClick={onClose} className="text-ink-3 hover:text-ink-1 transition-colors p-1">
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

        {/* ── Validation summary ── */}
        {hasErrors && (
          <div
            className="rounded-xl px-4 py-3.5"
            style={{
              background: 'oklch(70% 0.18 25 / 0.07)',
              border: '1px solid oklch(70% 0.18 25 / 0.25)',
            }}
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: 'oklch(70% 0.18 25)' }} />
              <div>
                <p className="text-[12px] font-medium" style={{ color: 'oklch(70% 0.18 25)' }}>
                  {errors.length} error{errors.length !== 1 ? 's' : ''} must be fixed before publishing
                </p>
                <ul className="mt-2 space-y-1">
                  {errors.slice(0, 3).map((e: { id: string; message: string }) => (
                    <li key={e.id} className="text-[11px] leading-relaxed" style={{ color: '#8a90a4' }}>
                      · {e.message}
                    </li>
                  ))}
                  {errors.length > 3 && (
                    <li className="text-[11px]" style={{ color: '#5c6273' }}>
                      · and {errors.length - 3} more…
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {!hasErrors && hasWarnings && (
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: 'oklch(80% 0.16 60 / 0.07)',
              border: '1px solid oklch(80% 0.16 60 / 0.25)',
            }}
          >
            <button
              onClick={onToggleWarnings}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-left"
            >
              <AlertTriangle size={13} className="shrink-0" style={{ color: 'oklch(80% 0.16 60)' }} />
              <span className="flex-1 text-[12px]" style={{ color: 'oklch(80% 0.16 60)' }}>
                {warnings.length} warning{warnings.length !== 1 ? 's' : ''} — you can still publish
              </span>
              {showWarnings
                ? <ChevronUp size={12} style={{ color: '#5c6273' }} />
                : <ChevronDown size={12} style={{ color: '#5c6273' }} />}
            </button>
            {showWarnings && (
              <div className="px-4 pb-3 space-y-1 border-t" style={{ borderColor: 'oklch(80% 0.16 60 / 0.15)' }}>
                {warnings.map((w: { id: string; message: string }) => (
                  <p key={w.id} className="text-[11px] leading-relaxed pt-1" style={{ color: '#8a90a4' }}>
                    · {w.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {!hasErrors && !hasWarnings && (
          <div
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
            style={{
              background: 'oklch(82% 0.18 165 / 0.07)',
              border: '1px solid oklch(82% 0.18 165 / 0.2)',
            }}
          >
            <CheckCircle2 size={13} style={{ color: 'oklch(82% 0.18 165)' }} />
            <span className="text-[12px]" style={{ color: 'oklch(82% 0.18 165)' }}>
              Scenario is valid and ready to publish
            </span>
          </div>
        )}

        {/* ── Slug editor (only when not blocked) ── */}
        {!hasErrors && (
          <div>
            <p
              className="text-[9px] font-mono tracking-[0.16em] uppercase mb-2"
              style={{ color: '#5c6273' }}
            >
              Public URL
            </p>

            {/* URL bar */}
            <div
              className="flex items-center rounded-xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${slugError ? 'oklch(70% 0.18 25 / 0.5)' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              <span
                className="shrink-0 pl-3 pr-1 font-mono text-[12px] select-none"
                style={{ color: '#5c6273' }}
              >
                /play/
              </span>
              <input
                className="flex-1 bg-transparent py-2.5 pr-3 font-mono text-[12px] outline-none"
                style={{ color: '#e8eaf0' }}
                value={slug}
                onChange={onSlugChange}
                placeholder="my-scenario"
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            {/* Slug feedback */}
            {slugError ? (
              <p className="text-[10px] font-mono mt-1.5" style={{ color: 'oklch(70% 0.18 25)' }}>
                {slugError}
              </p>
            ) : slug.length >= 2 ? (
              <p className="text-[10px] font-mono mt-1.5" style={{ color: 'oklch(82% 0.18 165)' }}>
                ✓ Available
              </p>
            ) : null}
          </div>
        )}

        {/* ── Republish note ── */}
        {isRepublish && scenario.publishedVersion && !hasErrors && (
          <div
            className="px-3.5 py-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="text-[11px] leading-relaxed" style={{ color: '#5c6273' }}>
              Currently live at{' '}
              <span className="font-mono" style={{ color: '#8a90a4' }}>
                /play/{scenario.publishedVersion.slug}
              </span>
              {' '}· v{scenario.publishedVersion.version}
              {' '}· {new Date(scenario.publishedVersion.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
            <p className="text-[11px] mt-1" style={{ color: '#3a3f4e' }}>
              Publishing creates a new snapshot — the old URL will keep working.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="shrink-0 px-5 py-3.5 border-t flex items-center justify-end gap-2"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-xs font-mono transition-all hover:bg-white/5"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#8a90a4' }}
        >
          Cancel
        </button>
        <button
          onClick={onPublish}
          disabled={!canPublish}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all"
          style={canPublish ? {
            background: 'oklch(82% 0.18 165)',
            color: '#052916',
            boxShadow: '0 0 20px oklch(82% 0.18 165 / 0.35)',
          } : {
            background: 'rgba(255,255,255,0.04)',
            color: '#3a3f4e',
            border: '1px solid rgba(255,255,255,0.07)',
            cursor: 'not-allowed',
          }}
        >
          <Globe size={12} />
          {isRepublish ? 'Republish' : 'Publish'}
        </button>
      </div>
    </>
  )
}

// ── SuccessStep ───────────────────────────────────────────────────────────────

interface SuccessStepProps {
  scenario: Scenario
  slug: string
  publicUrl: string
  copied: boolean
  onCopy: () => void
  onClose: () => void
}

function SuccessStep({ scenario, slug, publicUrl, copied, onCopy, onClose }: SuccessStepProps) {
  return (
    <>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 h-[52px] shrink-0 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-2.5">
          <CheckCircle2 size={14} style={{ color: 'oklch(82% 0.18 165)' }} />
          <span className="text-sm font-medium" style={{ color: 'oklch(82% 0.18 165)' }}>
            Published!
          </span>
        </div>
        <button onClick={onClose} className="text-ink-3 hover:text-ink-1 transition-colors p-1">
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-6 space-y-5">

        {/* Scenario title */}
        <div className="text-center">
          <p className="text-xs font-mono text-ink-4 tracking-widest uppercase mb-1">
            {scenario.title}
          </p>
          <p className="text-[11px] text-ink-3">
            is now live and shareable
          </p>
        </div>

        {/* URL display */}
        <div
          className="flex items-center gap-2 px-3.5 py-3 rounded-xl"
          style={{
            background: 'oklch(82% 0.18 165 / 0.06)',
            border: '1px solid oklch(82% 0.18 165 / 0.2)',
          }}
        >
          <Globe size={12} style={{ color: 'oklch(82% 0.18 165)', flexShrink: 0 }} />
          <span className="flex-1 font-mono text-[12px] truncate" style={{ color: '#c9cdda' }}>
            /play/{slug}
          </span>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onCopy}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono border transition-all hover:bg-white/5"
            style={{ borderColor: 'rgba(255,255,255,0.1)', color: copied ? 'oklch(82% 0.18 165)' : '#c9cdda' }}
          >
            <Copy size={12} />
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <a
            href={`/play/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono transition-all"
            style={{
              background: 'oklch(82% 0.18 165 / 0.12)',
              border: '1px solid oklch(82% 0.18 165 / 0.3)',
              color: 'oklch(82% 0.18 165)',
            }}
          >
            <ExternalLink size={12} />
            Open player
          </a>
        </div>
      </div>

      {/* Footer */}
      <div
        className="shrink-0 px-5 py-3.5 border-t flex justify-end"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-xs font-mono transition-all hover:bg-white/5"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#8a90a4' }}
        >
          Continue editing
        </button>
      </div>
    </>
  )
}
