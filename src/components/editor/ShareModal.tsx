'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  X, Globe, Copy, ExternalLink, Loader2, Check,
  Smartphone, Monitor, Lock, Unlock, Eye, EyeOff,
  AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  Code2, Share2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { validateSlugFormat } from '@/lib/scenario-store'
import { isSlugAvailable } from '@/lib/persistence/scenarios'
import type { Scenario, ValidationResult, PublishConfig, Orientation } from '@/types'

interface ShareModalProps {
  scenario: Scenario
  isDirty: boolean
  validationResult: ValidationResult
  onPublish: (config: PublishConfig) => Promise<void>
  onClose: () => void
}

type SlugState = 'idle' | 'checking' | 'ok' | 'error'

export function ShareModal({ scenario, isDirty, validationResult, onPublish, onClose }: ShareModalProps) {
  const pub = scenario.publishedVersion!
  const hasChanges = isDirty || new Date(scenario.updatedAt) > new Date(pub.publishedAt)

  const [orientation, setOrientation] = useState<Orientation>(pub.orientation ?? 'vertical')
  const [passwordProtected, setPasswordProtected] = useState(pub.passwordProtected ?? false)
  const [password, setPassword] = useState(pub.password ?? '')
  const [showPassword, setShowPassword] = useState(false)

  const [slug, setSlug] = useState(pub.slug)
  const [slugState, setSlugState] = useState<SlugState>('ok')
  const [slugError, setSlugError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showWarnings, setShowWarnings] = useState(false)

  const { errors, warnings } = validationResult
  const hasErrors = errors.length > 0

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/play/${pub.slug}`
    : `/play/${pub.slug}`

  const slugChanged = slug !== pub.slug

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!slugChanged) {
      setSlugState('ok')
      setSlugError(null)
      return
    }

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
  }, [slug, scenario.id, slugChanged])

  const settingsChanged = orientation !== (pub.orientation ?? 'vertical')
    || passwordProtected !== (pub.passwordProtected ?? false)
    || (passwordProtected && password !== (pub.password ?? ''))
    || slugChanged

  const canUpdate = !hasErrors
    && slugState === 'ok'
    && (!passwordProtected || password.length >= 4)
    && !isUpdating

  const canUpdateAndHasChanges = canUpdate && (hasChanges || settingsChanged)

  const handleUpdate = async () => {
    if (!canUpdateAndHasChanges) return
    setIsUpdating(true)
    setUpdateError(null)
    try {
      await onPublish({
        slug,
        orientation,
        passwordProtected,
        password: passwordProtected ? password : undefined,
      })
      onClose()
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Update failed — please try again')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked */ }
  }, [publicUrl])

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
  }

  const publishedDate = new Date(pub.publishedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

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
          maxHeight: 'min(800px, 94vh)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 h-[52px] shrink-0 border-b"
          style={{ borderColor: 'var(--line-1)' }}
        >
          <div className="flex items-center gap-2.5">
            <Share2 size={14} style={{ color: 'oklch(82% 0.18 165)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--fg-0)' }}>Share</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{
              background: 'oklch(82% 0.18 165 / 0.1)',
              border: '1px solid oklch(82% 0.18 165 / 0.25)',
              color: 'oklch(82% 0.18 165)',
            }}>
              v{pub.version}
            </span>
          </div>
          <button onClick={onClose} className="p-1 transition-colors hover:text-ink-1" style={{ color: 'var(--fg-3)' }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* ── Live URL ─────────────────────────────────────────────── */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'oklch(82% 0.18 165 / 0.05)', border: '1px solid oklch(82% 0.18 165 / 0.2)' }}
          >
            <div className="px-4 py-3 flex items-center gap-2">
              <Globe size={12} style={{ color: 'oklch(82% 0.18 165)', flexShrink: 0 }} />
              <span className="flex-1 font-mono text-[12px] truncate" style={{ color: 'var(--fg-1)' }}>
                {publicUrl}
              </span>
              <button
                onClick={handleCopy}
                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono transition-all hover:bg-[var(--tint-3)]"
                style={{ border: '1px solid var(--line-2)', color: copied ? 'oklch(82% 0.18 165)' : 'var(--fg-2)' }}
              >
                {copied ? <Check size={10} /> : <Copy size={10} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <a
                href={`/play/${pub.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono transition-all hover:bg-[var(--tint-3)]"
                style={{ border: '1px solid var(--line-2)', color: 'var(--fg-2)' }}
              >
                <ExternalLink size={10} />
                Open
              </a>
            </div>
            <div className="px-4 pb-3 flex items-center gap-2.5 flex-wrap">
              <span className="text-[10px] font-mono" style={{ color: 'var(--fg-4)' }}>
                Published {publishedDate} · v{pub.version}
              </span>
              {(hasChanges || settingsChanged) && (
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                  style={{ background: 'oklch(80% 0.16 60 / 0.12)', color: 'oklch(80% 0.16 60)', border: '1px solid oklch(80% 0.16 60 / 0.3)' }}
                >
                  {settingsChanged && !hasChanges ? 'settings changed' : 'draft changes'}
                </span>
              )}
            </div>
          </div>

          {/* ── Embed code ───────────────────────────────────────────── */}
          <EmbedCodeBlock slug={pub.slug} publicUrl={publicUrl} />

          <div style={{ height: 1, background: 'var(--line-1)' }} />

          {/* ── Access settings ──────────────────────────────────────── */}
          <div className="space-y-4">
            <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--fg-3)' }}>Access settings</p>

            {/* Orientation */}
            <div className="space-y-2">
              <p className="text-[10px] font-mono" style={{ color: 'var(--fg-4)' }}>Orientation</p>
              <div className="flex gap-2">
                {([
                  { value: 'vertical' as Orientation, icon: <Smartphone size={13} />, label: 'Portrait' },
                  { value: 'horizontal' as Orientation, icon: <Monitor size={13} />, label: 'Landscape' },
                ] as const).map(({ value, icon, label }) => {
                  const selected = orientation === value
                  return (
                    <button
                      key={value}
                      onClick={() => setOrientation(value)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono transition-all"
                      style={{
                        background: selected ? 'oklch(82% 0.18 165 / 0.1)' : 'var(--tint-1)',
                        border: `1px solid ${selected ? 'oklch(82% 0.18 165 / 0.4)' : 'var(--line-2)'}`,
                        color: selected ? 'oklch(82% 0.18 165)' : 'var(--fg-2)',
                      }}
                    >
                      {icon}
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Access / password */}
            <div className="space-y-2">
              <p className="text-[10px] font-mono" style={{ color: 'var(--fg-4)' }}>Access</p>
              <div className="flex gap-2">
                {([
                  { value: false, icon: <Unlock size={13} />, label: 'Public' },
                  { value: true, icon: <Lock size={13} />, label: 'Password' },
                ] as const).map(({ value, icon, label }) => {
                  const selected = passwordProtected === value
                  return (
                    <button
                      key={String(value)}
                      onClick={() => setPasswordProtected(value)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono transition-all"
                      style={{
                        background: selected ? 'oklch(82% 0.18 165 / 0.1)' : 'var(--tint-1)',
                        border: `1px solid ${selected ? 'oklch(82% 0.18 165 / 0.4)' : 'var(--line-2)'}`,
                        color: selected ? 'oklch(82% 0.18 165)' : 'var(--fg-2)',
                      }}
                    >
                      {icon}
                      {label}
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
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="flex items-center rounded-xl overflow-hidden mt-1"
                      style={{ background: 'var(--tint-1)', border: '1px solid var(--line-2)' }}
                    >
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Min. 4 characters"
                        className="flex-1 bg-transparent py-2.5 px-3.5 text-sm outline-none font-mono"
                        style={{ color: 'var(--fg-1)' }}
                        minLength={4}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="px-3 transition-colors"
                        style={{ color: 'var(--fg-3)' }}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* URL slug */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-mono" style={{ color: 'var(--fg-4)' }}>URL Slug</p>
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
                  onChange={handleSlugChange}
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
                <p className="text-[10px] font-mono" style={{ color: 'oklch(70% 0.18 25)' }}>{slugError}</p>
              ) : slugChanged && slugState === 'ok' ? (
                <p className="text-[10px] font-mono" style={{ color: 'oklch(82% 0.18 165)' }}>✓ Available</p>
              ) : slugState === 'checking' ? (
                <p className="text-[10px] font-mono" style={{ color: 'var(--fg-3)' }}>Checking…</p>
              ) : null}
            </div>
          </div>

          {/* ── Validation ───────────────────────────────────────────── */}
          {hasErrors && (
            <div
              className="rounded-xl px-4 py-3.5"
              style={{ background: 'oklch(70% 0.18 25 / 0.07)', border: '1px solid oklch(70% 0.18 25 / 0.25)' }}
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: 'oklch(70% 0.18 25)' }} />
                <div>
                  <p className="text-[12px] font-medium" style={{ color: 'oklch(70% 0.18 25)' }}>
                    {errors.length} error{errors.length !== 1 ? 's' : ''} must be fixed before updating
                  </p>
                  <ul className="mt-2 space-y-1">
                    {errors.slice(0, 3).map(e => (
                      <li key={e.id} className="text-[11px] leading-relaxed" style={{ color: 'var(--fg-2)' }}>
                        · {e.message}
                      </li>
                    ))}
                    {errors.length > 3 && (
                      <li className="text-[11px]" style={{ color: 'var(--fg-3)' }}>· and {errors.length - 3} more…</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {!hasErrors && warnings.length > 0 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: 'oklch(80% 0.16 60 / 0.07)', border: '1px solid oklch(80% 0.16 60 / 0.25)' }}
            >
              <button
                onClick={() => setShowWarnings(v => !v)}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-left"
              >
                <AlertTriangle size={13} className="shrink-0" style={{ color: 'oklch(80% 0.16 60)' }} />
                <span className="flex-1 text-[12px]" style={{ color: 'oklch(80% 0.16 60)' }}>
                  {warnings.length} warning{warnings.length !== 1 ? 's' : ''} — you can still update
                </span>
                {showWarnings
                  ? <ChevronUp size={12} style={{ color: 'var(--fg-3)' }} />
                  : <ChevronDown size={12} style={{ color: 'var(--fg-3)' }} />}
              </button>
              {showWarnings && (
                <div className="px-4 pb-3 space-y-1 border-t" style={{ borderColor: 'oklch(80% 0.16 60 / 0.15)' }}>
                  {warnings.map(w => (
                    <p key={w.id} className="text-[11px] leading-relaxed pt-1" style={{ color: 'var(--fg-2)' }}>
                      · {w.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {updateError && (
            <p className="text-[11px] font-mono" style={{ color: 'oklch(70% 0.18 25)' }}>{updateError}</p>
          )}
        </div>

        {/* Footer */}
        <div
          className="shrink-0 px-5 py-3.5 border-t flex items-center justify-between"
          style={{ borderColor: 'var(--line-1)' }}
        >
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="px-4 py-2 rounded-xl text-xs font-mono transition-all hover:bg-[var(--tint-3)] disabled:opacity-50"
            style={{ border: '1px solid var(--line-2)', color: 'var(--fg-3)' }}
          >
            Close
          </button>

          <button
            onClick={handleUpdate}
            disabled={!canUpdateAndHasChanges}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all"
            style={canUpdateAndHasChanges ? {
              background: 'oklch(82% 0.18 165)',
              color: '#052916',
              boxShadow: '0 0 20px oklch(82% 0.18 165 / 0.35)',
            } : {
              background: 'var(--tint-2)',
              color: 'var(--fg-4)',
              border: '1px solid var(--line-1)',
              cursor: !hasChanges && !settingsChanged ? 'default' : 'not-allowed',
            }}
          >
            {isUpdating ? (
              <><Loader2 size={12} className="animate-spin" /> Updating…</>
            ) : !hasChanges && !settingsChanged ? (
              <><CheckCircle2 size={12} /> Up to date</>
            ) : (
              <><Globe size={12} /> Update</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── EmbedCodeBlock ────────────────────────────────────────────────────────────

function EmbedCodeBlock({ slug, publicUrl }: { slug: string; publicUrl: string }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'iframe' | 'webcomponent'>('iframe')
  const [copied, setCopied] = useState(false)

  const appUrl = publicUrl.replace(`/play/${slug}`, '')
  const iframeSnippet = `<iframe\n  src="${publicUrl}?embed=1"\n  allow="autoplay; fullscreen"\n  style="border:none;width:100%;height:100%;min-height:500px"\n></iframe>`
  const wcSnippet = `<script src="${appUrl}/api/embed" defer></script>\n<branchlab-player slug="${slug}"></branchlab-player>`
  const snippet = tab === 'iframe' ? iframeSnippet : wcSnippet

  const handleCopy = () => {
    navigator.clipboard?.writeText(snippet).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      className="rounded-xl overflow-hidden border"
      style={{ borderColor: 'var(--line-2)' }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-mono transition-colors hover:bg-[var(--tint-2)]"
        style={{ color: 'var(--fg-3)' }}
      >
        <span className="flex items-center gap-2">
          <Code2 size={11} />
          Embed code
        </span>
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--line-2)' }}>
          <div className="flex" style={{ borderBottom: '1px solid var(--line-2)' }}>
            {(['iframe', 'webcomponent'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-3.5 py-2 text-[10px] font-mono transition-colors"
                style={{
                  color: tab === t ? 'var(--fg-0)' : 'var(--fg-4)',
                  borderBottom: tab === t ? '1px solid oklch(82% 0.18 165)' : '1px solid transparent',
                  marginBottom: -1,
                }}
              >
                {t === 'iframe' ? 'iframe' : 'Web Component'}
              </button>
            ))}
          </div>

          <div className="relative">
            <pre
              className="text-[10px] font-mono leading-relaxed px-3.5 py-3 overflow-x-auto"
              style={{ color: 'var(--fg-2)', background: 'var(--tint-1)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
            >
              {snippet}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono transition-all"
              style={{
                background: 'var(--bg-1)',
                border: '1px solid var(--line-2)',
                color: copied ? 'oklch(82% 0.18 165)' : 'var(--fg-3)',
              }}
            >
              <Copy size={9} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
