'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X, CheckCircle2, AlertTriangle, AlertCircle,
  Globe, Copy, ExternalLink, ChevronDown, ChevronUp,
  Loader2, Smartphone, Monitor, Lock, Unlock, Eye, EyeOff,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { slugify, validateSlugFormat, isSlugAvailable } from '@/lib/scenario-store'
import type { Scenario, ValidationResult, PublishConfig, Orientation } from '@/types'

interface PublishModalProps {
  scenario: Scenario
  validationResult: ValidationResult
  onPublish: (config: PublishConfig) => Promise<void>
  onClose: () => void
}

type WizardStep = 'orientation' | 'access' | 'url' | 'success'
type SlugState = 'idle' | 'checking' | 'ok' | 'error'

const STEPS: WizardStep[] = ['orientation', 'access', 'url']

function stepIndex(step: WizardStep) {
  return STEPS.indexOf(step)
}

export function PublishModal({ scenario, validationResult, onPublish, onClose }: PublishModalProps) {
  const isRepublish = !!scenario.publishedVersion

  // Wizard state
  const [step, setStep] = useState<WizardStep>('orientation')
  const [orientation, setOrientation] = useState<Orientation>(
    scenario.publishedVersion?.orientation ?? 'vertical'
  )
  const [passwordProtected, setPasswordProtected] = useState(
    scenario.publishedVersion?.passwordProtected ?? false
  )
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Slug state
  const [slug, setSlug] = useState(() =>
    scenario.publishedVersion?.slug ?? slugify(scenario.title)
  )
  const [slugState, setSlugState] = useState<SlugState>('idle')
  const [slugError, setSlugError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Publish state
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishedSlug, setPublishedSlug] = useState('')
  const [copied, setCopied] = useState(false)

  const [showWarnings, setShowWarnings] = useState(false)
  const { errors, warnings } = validationResult
  const hasErrors = errors.length > 0

  // Debounced slug validation
  useEffect(() => {
    if (step !== 'url') return
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const formatError = validateSlugFormat(slug)
    if (formatError) {
      setSlugError(formatError)
      setSlugState('error')
      return
    }

    setSlugState('checking')
    setSlugError(null)

    debounceRef.current = setTimeout(async () => {
      try {
        const available = await isSlugAvailable(slug, scenario.id)
        if (!available) {
          setSlugError('This URL is already taken')
          setSlugState('error')
        } else {
          setSlugState('ok')
          setSlugError(null)
        }
      } catch {
        setSlugState('ok')
        setSlugError(null)
      }
    }, 400)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [slug, scenario.id, step])

  const canPublish = !hasErrors && slugState === 'ok' && !isPublishing
    && (!passwordProtected || password.length >= 4)

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
  }

  const handlePublish = async () => {
    if (!canPublish) return
    setIsPublishing(true)
    setPublishError(null)
    try {
      await onPublish({ slug, orientation, passwordProtected, password: passwordProtected ? password : undefined })
      setPublishedSlug(slug)
      setStep('success')
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Publish failed — please try again')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleCopy = useCallback(async () => {
    const url = `${window.location.origin}/play/${publishedSlug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked */ }
  }, [publishedSlug])

  const goNext = () => {
    const idx = stepIndex(step as WizardStep)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
    else handlePublish()
  }

  const goBack = () => {
    const idx = stepIndex(step as WizardStep)
    if (idx > 0) setStep(STEPS[idx - 1])
  }

  const isLastStep = stepIndex(step as WizardStep) === STEPS.length - 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[480px] rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--line-2)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          maxHeight: 'min(720px, 92vh)',
        }}
      >
        {step === 'success' ? (
          <SuccessStep
            scenario={scenario}
            slug={publishedSlug}
            copied={copied}
            onCopy={handleCopy}
            onClose={onClose}
          />
        ) : (
          <>
            {/* ── Header ── */}
            <div
              className="flex items-center justify-between px-5 h-[52px] shrink-0 border-b"
              style={{ borderColor: 'var(--line-1)' }}
            >
              <div className="flex items-center gap-3">
                <Globe size={14} style={{ color: hasErrors ? 'oklch(70% 0.18 25)' : 'var(--fg-2)' }} />
                <span className="text-sm font-medium text-ink-0">
                  {isRepublish ? 'Republish' : 'Publish'} scenario
                </span>
                {/* Step dots */}
                <div className="flex items-center gap-1.5 ml-1">
                  {STEPS.map((s, i) => (
                    <div
                      key={s}
                      className="rounded-full transition-all"
                      style={{
                        width: step === s ? 16 : 6,
                        height: 6,
                        background: step === s
                          ? 'oklch(82% 0.18 165)'
                          : i < stepIndex(step as WizardStep)
                          ? 'oklch(82% 0.18 165 / 0.4)'
                          : 'var(--fg-4)',
                      }}
                    />
                  ))}
                </div>
              </div>
              <button onClick={onClose} className="text-ink-3 hover:text-ink-1 transition-colors p-1">
                <X size={14} />
              </button>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="px-5 py-5"
                >
                  {step === 'orientation' && (
                    <OrientationStep
                      orientation={orientation}
                      onChange={setOrientation}
                    />
                  )}
                  {step === 'access' && (
                    <AccessStep
                      passwordProtected={passwordProtected}
                      password={password}
                      showPassword={showPassword}
                      onToggleProtected={setPasswordProtected}
                      onPasswordChange={setPassword}
                      onToggleShow={() => setShowPassword(v => !v)}
                    />
                  )}
                  {step === 'url' && (
                    <UrlStep
                      errors={errors}
                      warnings={warnings}
                      slug={slug}
                      slugState={slugState}
                      slugError={slugError}
                      showWarnings={showWarnings}
                      isRepublish={isRepublish}
                      scenario={scenario}
                      publishError={publishError}
                      onSlugChange={handleSlugChange}
                      onToggleWarnings={() => setShowWarnings(v => !v)}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── Footer ── */}
            <div
              className="shrink-0 px-5 py-3.5 border-t flex items-center justify-between"
              style={{ borderColor: 'var(--line-1)' }}
            >
              <button
                onClick={onClose}
                disabled={isPublishing}
                className="px-4 py-2 rounded-xl text-xs font-mono transition-all hover:bg-[var(--tint-3)] disabled:opacity-50"
                style={{ border: '1px solid var(--line-2)', color: 'var(--fg-3)' }}
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                {stepIndex(step as WizardStep) > 0 && (
                  <button
                    onClick={goBack}
                    disabled={isPublishing}
                    className="px-4 py-2 rounded-xl text-xs font-mono transition-all hover:bg-[var(--tint-3)] disabled:opacity-50"
                    style={{ border: '1px solid var(--line-2)', color: 'var(--fg-2)' }}
                  >
                    Back
                  </button>
                )}

                <button
                  onClick={goNext}
                  disabled={isLastStep ? !canPublish : false}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all"
                  style={isLastStep && !canPublish ? {
                    background: 'var(--tint-2)',
                    color: 'var(--fg-4)',
                    border: '1px solid var(--line-1)',
                    cursor: 'not-allowed',
                  } : {
                    background: 'oklch(82% 0.18 165)',
                    color: '#052916',
                    boxShadow: '0 0 20px oklch(82% 0.18 165 / 0.35)',
                  }}
                >
                  {isPublishing ? (
                    <><Loader2 size={12} className="animate-spin" /> Publishing…</>
                  ) : isLastStep ? (
                    <><Globe size={12} /> {isRepublish ? 'Republish' : 'Publish'}</>
                  ) : (
                    'Continue →'
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}

// ── Step 1: Orientation ───────────────────────────────────────────────────────

function OrientationStep({
  orientation,
  onChange,
}: {
  orientation: Orientation
  onChange: (o: Orientation) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[9px] font-mono tracking-[0.16em] uppercase mb-1" style={{ color: 'var(--fg-3)' }}>
          Step 1 — Orientation
        </p>
        <p className="text-sm font-medium text-ink-0 mb-1">How will viewers watch this?</p>
        <p className="text-xs" style={{ color: 'var(--fg-3)' }}>
          Choose the layout that best fits your video content and audience.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          {
            value: 'vertical' as Orientation,
            icon: <Smartphone size={26} />,
            label: 'Portrait',
            sub: 'Mobile-first',
            detail: 'Best for phone screens · Full-screen vertical video',
          },
          {
            value: 'horizontal' as Orientation,
            icon: <Monitor size={26} />,
            label: 'Landscape',
            sub: 'Desktop-first',
            detail: 'Best for wide screens · Horizontal video',
          },
        ].map(({ value, icon, label, sub, detail }) => {
          const selected = orientation === value
          return (
            <button
              key={value}
              onClick={() => onChange(value)}
              className="relative flex flex-col items-center gap-3 px-4 py-5 rounded-2xl text-left transition-all"
              style={{
                background: selected ? 'oklch(82% 0.18 165 / 0.07)' : 'var(--tint-1)',
                border: `2px solid ${selected ? 'oklch(82% 0.18 165 / 0.6)' : 'var(--line-2)'}`,
                boxShadow: selected ? '0 0 0 4px oklch(82% 0.18 165 / 0.08)' : 'none',
              }}
            >
              <div style={{ color: selected ? 'oklch(82% 0.18 165)' : 'var(--fg-3)' }}>{icon}</div>
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: selected ? 'var(--fg-0)' : 'var(--fg-1)' }}>
                  {label}
                </p>
                <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--fg-3)' }}>
                  {sub}
                </p>
              </div>
              <p className="text-[10px] text-center leading-relaxed" style={{ color: 'var(--fg-4)' }}>
                {detail}
              </p>
              {selected && (
                <div
                  className="absolute top-3 right-3 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: 'oklch(82% 0.18 165)', color: '#052916' }}
                >
                  <CheckCircle2 size={10} />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Step 2: Access ────────────────────────────────────────────────────────────

function AccessStep({
  passwordProtected,
  password,
  showPassword,
  onToggleProtected,
  onPasswordChange,
  onToggleShow,
}: {
  passwordProtected: boolean
  password: string
  showPassword: boolean
  onToggleProtected: (v: boolean) => void
  onPasswordChange: (v: string) => void
  onToggleShow: () => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[9px] font-mono tracking-[0.16em] uppercase mb-1" style={{ color: 'var(--fg-3)' }}>
          Step 2 — Access
        </p>
        <p className="text-sm font-medium text-ink-0 mb-1">Who can play?</p>
        <p className="text-xs" style={{ color: 'var(--fg-3)' }}>
          Control who can access the published scenario.
        </p>
      </div>

      <div className="space-y-2">
        {[
          {
            value: false,
            icon: <Unlock size={14} />,
            label: 'Public',
            desc: 'Anyone with the link can play',
          },
          {
            value: true,
            icon: <Lock size={14} />,
            label: 'Password protected',
            desc: 'Require a code to play',
          },
        ].map(({ value, icon, label, desc }) => {
          const selected = passwordProtected === value
          return (
            <button
              key={String(value)}
              onClick={() => onToggleProtected(value)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all"
              style={{
                background: selected ? 'oklch(82% 0.18 165 / 0.07)' : 'var(--tint-1)',
                border: `1px solid ${selected ? 'oklch(82% 0.18 165 / 0.4)' : 'var(--line-2)'}`,
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: selected ? 'oklch(82% 0.18 165 / 0.15)' : 'var(--tint-2)',
                  color: selected ? 'oklch(82% 0.18 165)' : 'var(--fg-3)',
                }}
              >
                {icon}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: selected ? 'var(--fg-0)' : 'var(--fg-1)' }}>
                  {label}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-3)' }}>{desc}</p>
              </div>
              <div className="ml-auto">
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                  style={{
                    borderColor: selected ? 'oklch(82% 0.18 165)' : 'var(--line-3)',
                    background: selected ? 'oklch(82% 0.18 165)' : 'transparent',
                  }}
                >
                  {selected && <div className="w-1.5 h-1.5 rounded-full bg-[#052916]" />}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <AnimatePresence>
        {passwordProtected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2">
              <label className="block text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--fg-3)' }}>
                Access code
              </label>
              <div
                className="flex items-center rounded-xl overflow-hidden"
                style={{ background: 'var(--tint-1)', border: '1px solid var(--line-2)' }}
              >
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => onPasswordChange(e.target.value)}
                  placeholder="Min. 4 characters"
                  className="flex-1 bg-transparent py-2.5 px-3.5 text-sm outline-none"
                  style={{ color: 'var(--fg-1)' }}
                  minLength={4}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={onToggleShow}
                  className="px-3 transition-colors"
                  style={{ color: 'var(--fg-3)' }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--fg-4)' }}>
                Players will be asked for this code before they can view the scenario.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Step 3: URL ───────────────────────────────────────────────────────────────

function UrlStep({
  errors, warnings, slug, slugState, slugError, showWarnings,
  isRepublish, scenario, publishError,
  onSlugChange, onToggleWarnings,
}: {
  errors: ValidationResult['errors']
  warnings: ValidationResult['warnings']
  slug: string
  slugState: SlugState
  slugError: string | null
  showWarnings: boolean
  isRepublish: boolean
  scenario: Scenario
  publishError: string | null
  onSlugChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onToggleWarnings: () => void
}) {
  const hasErrors = errors.length > 0
  const hasWarnings = warnings.length > 0

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[9px] font-mono tracking-[0.16em] uppercase mb-1" style={{ color: 'var(--fg-3)' }}>
          Step 3 — URL
        </p>
        <p className="text-sm font-medium text-ink-0 mb-1">Set your public URL</p>
      </div>

      {/* Validation */}
      {hasErrors && (
        <div
          className="rounded-xl px-4 py-3.5"
          style={{ background: 'oklch(70% 0.18 25 / 0.07)', border: '1px solid oklch(70% 0.18 25 / 0.25)' }}
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: 'oklch(70% 0.18 25)' }} />
            <div>
              <p className="text-[12px] font-medium" style={{ color: 'oklch(70% 0.18 25)' }}>
                {errors.length} error{errors.length !== 1 ? 's' : ''} must be fixed before publishing
              </p>
              <ul className="mt-2 space-y-1">
                {errors.slice(0, 3).map((e) => (
                  <li key={e.id} className="text-[11px] leading-relaxed" style={{ color: 'var(--fg-2)' }}>
                    · {e.message}
                  </li>
                ))}
                {errors.length > 3 && (
                  <li className="text-[11px]" style={{ color: 'var(--fg-3)' }}>
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
          style={{ background: 'oklch(80% 0.16 60 / 0.07)', border: '1px solid oklch(80% 0.16 60 / 0.25)' }}
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
              ? <ChevronUp size={12} style={{ color: 'var(--fg-3)' }} />
              : <ChevronDown size={12} style={{ color: 'var(--fg-3)' }} />}
          </button>
          {showWarnings && (
            <div className="px-4 pb-3 space-y-1 border-t" style={{ borderColor: 'oklch(80% 0.16 60 / 0.15)' }}>
              {warnings.map((w) => (
                <p key={w.id} className="text-[11px] leading-relaxed pt-1" style={{ color: 'var(--fg-2)' }}>
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
          style={{ background: 'oklch(82% 0.18 165 / 0.07)', border: '1px solid oklch(82% 0.18 165 / 0.2)' }}
        >
          <CheckCircle2 size={13} style={{ color: 'oklch(82% 0.18 165)' }} />
          <span className="text-[12px]" style={{ color: 'oklch(82% 0.18 165)' }}>
            Scenario is valid and ready to publish
          </span>
        </div>
      )}

      {/* Slug input */}
      {!hasErrors && (
        <div>
          <div
            className="flex items-center rounded-xl overflow-hidden"
            style={{
              background: 'var(--tint-1)',
              border: `1px solid ${slugError ? 'oklch(70% 0.18 25 / 0.5)' : 'var(--line-2)'}`,
            }}
          >
            <span className="shrink-0 pl-3 pr-1 font-mono text-[12px] select-none" style={{ color: 'var(--fg-3)' }}>
              /play/
            </span>
            <input
              className="flex-1 bg-transparent py-2.5 pr-3 font-mono text-[12px] outline-none"
              style={{ color: 'var(--fg-1)' }}
              value={slug}
              onChange={onSlugChange}
              placeholder="my-scenario"
              spellCheck={false}
              autoComplete="off"
            />
            {slugState === 'checking' && (
              <span className="pr-3">
                <Loader2 size={12} className="animate-spin" style={{ color: 'var(--fg-3)' }} />
              </span>
            )}
          </div>

          {slugError ? (
            <p className="text-[10px] font-mono mt-1.5" style={{ color: 'oklch(70% 0.18 25)' }}>{slugError}</p>
          ) : slugState === 'ok' ? (
            <p className="text-[10px] font-mono mt-1.5" style={{ color: 'oklch(82% 0.18 165)' }}>✓ Available</p>
          ) : slugState === 'checking' ? (
            <p className="text-[10px] font-mono mt-1.5" style={{ color: 'var(--fg-3)' }}>Checking…</p>
          ) : null}
        </div>
      )}

      {/* Republish note */}
      {!hasErrors && isRepublish && scenario.publishedVersion && (
        <div
          className="px-3.5 py-3 rounded-xl"
          style={{ background: 'var(--tint-1)', border: '1px solid var(--line-1)' }}
        >
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--fg-3)' }}>
            Currently live at{' '}
            <span className="font-mono" style={{ color: 'var(--fg-2)' }}>
              /play/{scenario.publishedVersion.slug}
            </span>
            {' '}· v{scenario.publishedVersion.version}
          </p>
          <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--fg-4)' }}>
            Republishing replaces the live version. Your draft is unaffected.
          </p>
        </div>
      )}

      {publishError && (
        <p className="text-[11px] font-mono" style={{ color: 'oklch(70% 0.18 25)' }}>{publishError}</p>
      )}
    </div>
  )
}

// ── Success ───────────────────────────────────────────────────────────────────

function SuccessStep({
  scenario, slug, copied, onCopy, onClose,
}: {
  scenario: Scenario
  slug: string
  copied: boolean
  onCopy: () => void
  onClose: () => void
}) {
  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/play/${slug}`
    : `/play/${slug}`

  return (
    <>
      <div
        className="flex items-center justify-between px-5 h-[52px] shrink-0 border-b"
        style={{ borderColor: 'var(--line-1)' }}
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

      <div className="px-5 py-6 space-y-5">
        <div className="text-center">
          <p className="text-xs font-mono text-ink-4 tracking-widest uppercase mb-1">{scenario.title}</p>
          <p className="text-[11px] text-ink-3">is now live and shareable</p>
        </div>

        <div
          className="flex items-center gap-2 px-3.5 py-3 rounded-xl"
          style={{ background: 'oklch(82% 0.18 165 / 0.06)', border: '1px solid oklch(82% 0.18 165 / 0.2)' }}
        >
          <Globe size={12} style={{ color: 'oklch(82% 0.18 165)', flexShrink: 0 }} />
          <span className="flex-1 font-mono text-[12px] truncate" style={{ color: 'var(--fg-1)' }}>
            {publicUrl}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onCopy}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono border transition-all hover:bg-[var(--tint-3)]"
            style={{ borderColor: 'var(--line-2)', color: copied ? 'oklch(82% 0.18 165)' : 'var(--fg-1)' }}
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

      <div
        className="shrink-0 px-5 py-3.5 border-t flex justify-end"
        style={{ borderColor: 'var(--line-1)' }}
      >
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-xs font-mono transition-all hover:bg-[var(--tint-3)]"
          style={{ border: '1px solid var(--line-2)', color: 'var(--fg-2)' }}
        >
          Continue editing
        </button>
      </div>
    </>
  )
}
