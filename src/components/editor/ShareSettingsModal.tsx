'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Shield, Globe, Link2, Lock, EyeOff, Loader2, Check, Copy,
  AlertCircle, Eye, Plus, Trash2, ExternalLink, Power,
} from 'lucide-react'
import {
  fetchShareSettings, updateShareSettings,
  fetchShareTokens, createShareToken, revokeShareToken,
} from '@/lib/sharing/browser'
import type { ShareSettings, ShareToken } from '@/types/sharing'
import type { ScenarioVisibility } from '@/types'

interface ShareSettingsModalProps {
  scenarioId: string
  onClose: () => void
}

const VISIBILITY_OPTIONS: {
  value: ScenarioVisibility
  icon: React.ReactNode
  label: string
  description: string
}[] = [
  {
    value: 'public',
    icon: <Globe size={14} />,
    label: 'Public',
    description: 'Anyone with the link can play it. It may also be discoverable.',
  },
  {
    value: 'unlisted',
    icon: <Link2 size={14} />,
    label: 'Unlisted',
    description: "Hidden from listings — only people with the exact link can open it.",
  },
  {
    value: 'password',
    icon: <Lock size={14} />,
    label: 'Password protected',
    description: 'Visitors must enter a password you set before they can watch.',
  },
  {
    value: 'private',
    icon: <EyeOff size={14} />,
    label: 'Private',
    description: 'Only you, signed in as the creator, can view it.',
  },
]

function statusColor(visibility: ScenarioVisibility, accessEnabled: boolean) {
  if (!accessEnabled) return 'oklch(70% 0.18 25)'
  if (visibility === 'public') return 'oklch(82% 0.18 165)'
  if (visibility === 'unlisted') return 'oklch(80% 0.16 230)'
  if (visibility === 'password') return 'oklch(80% 0.16 60)'
  return 'oklch(75% 0.15 300)'
}

export function ShareSettingsModal({ scenarioId, onClose }: ShareSettingsModalProps) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [settings, setSettings] = useState<ShareSettings | null>(null)

  const [visibility, setVisibility] = useState<ScenarioVisibility>('public')
  const [accessEnabled, setAccessEnabled] = useState(true)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [clearPassword, setClearPassword] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const [tokens, setTokens] = useState<ShareToken[] | null>(null)
  const [tokensLoading, setTokensLoading] = useState(false)
  const [creatingToken, setCreatingToken] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const s = await fetchShareSettings(scenarioId)
      setSettings(s)
      setVisibility(s.visibility)
      setAccessEnabled(s.accessEnabled)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load share settings')
    } finally {
      setLoading(false)
    }
  }, [scenarioId])

  useEffect(() => { load() }, [load])

  const loadTokens = useCallback(async () => {
    setTokensLoading(true)
    try {
      setTokens(await fetchShareTokens(scenarioId))
    } catch {
      setTokens([])
    } finally {
      setTokensLoading(false)
    }
  }, [scenarioId])

  // Tokens are an optional escape hatch for password mode — only load on demand.
  useEffect(() => {
    if (visibility === 'password' && settings && tokens === null) loadTokens()
  }, [visibility, settings, tokens, loadTokens])

  const publicUrl = settings && typeof window !== 'undefined'
    ? `${window.location.origin}/play/${settings.slug}`
    : settings ? `/play/${settings.slug}` : ''

  const passwordTouched = password.length > 0 || clearPassword
  const settingsChanged = !!settings && (
    visibility !== settings.visibility
    || accessEnabled !== settings.accessEnabled
    || passwordTouched
  )
  const passwordValid = !(visibility === 'password' && !settings?.hasPassword && !clearPassword && password.length < 4 && password.length > 0)
  const needsNewPassword = visibility === 'password' && !settings?.hasPassword && password.length === 0

  const canSave = !!settings && settingsChanged && !saving
    && !(password.length > 0 && password.length < 4)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked */ }
  }, [publicUrl])

  const handleSave = async () => {
    if (!settings || !canSave) return
    setSaving(true)
    setSaveError(null)
    try {
      const patch: { visibility?: ScenarioVisibility; accessEnabled?: boolean; password?: string } = {}
      if (visibility !== settings.visibility) patch.visibility = visibility
      if (accessEnabled !== settings.accessEnabled) patch.accessEnabled = accessEnabled
      if (clearPassword) patch.password = ''
      else if (password.length > 0) patch.password = password

      const updated = await updateShareSettings(scenarioId, patch)
      setSettings(updated)
      setVisibility(updated.visibility)
      setAccessEnabled(updated.accessEnabled)
      setPassword('')
      setClearPassword(false)
      setSavedAt(Date.now())
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save — please try again')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateToken = async () => {
    setCreatingToken(true)
    try {
      const created = await createShareToken(scenarioId)
      setTokens((prev) => [created, ...(prev ?? [])])
    } catch { /* surfaced inline via empty state if it keeps failing */ }
    finally { setCreatingToken(false) }
  }

  const handleRevokeToken = async (tokenId: string) => {
    setRevokingId(tokenId)
    try {
      await revokeShareToken(scenarioId, tokenId)
      setTokens((prev) => (prev ?? []).map(t => t.id === tokenId ? { ...t, revokedAt: new Date().toISOString() } : t))
    } catch { /* no-op — token list will reflect true state on next open */ }
    finally { setRevokingId(null) }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
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
          maxHeight: 'min(820px, 94vh)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 h-[52px] shrink-0 border-b"
          style={{ borderColor: 'var(--line-1)' }}
        >
          <div className="flex items-center gap-2.5">
            <Shield size={14} style={{ color: 'oklch(82% 0.18 165)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--fg-0)' }}>Sharing &amp; access</span>
          </div>
          <button onClick={onClose} className="p-1 transition-colors hover:text-ink-1" style={{ color: 'var(--fg-3)' }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--fg-3)' }} />
            </div>
          )}

          {!loading && loadError && (
            <div
              className="rounded-xl px-4 py-3.5 flex items-start gap-2.5"
              style={{ background: 'oklch(70% 0.18 25 / 0.07)', border: '1px solid oklch(70% 0.18 25 / 0.25)' }}
            >
              <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: 'oklch(70% 0.18 25)' }} />
              <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-2)' }}>{loadError}</p>
            </div>
          )}

          {!loading && settings && (
            <>
              {/* Live URL */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: 'oklch(82% 0.18 165 / 0.05)', border: '1px solid oklch(82% 0.18 165 / 0.2)' }}
              >
                <div className="px-4 py-3 flex items-center gap-2">
                  <Globe size={12} style={{ color: 'oklch(82% 0.18 165)', flexShrink: 0 }} />
                  <span className="flex-1 font-mono text-[12px] truncate" style={{ color: 'var(--fg-1)' }}>{publicUrl}</span>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono transition-all hover:bg-[var(--tint-3)]"
                    style={{ border: '1px solid var(--line-2)', color: copied ? 'oklch(82% 0.18 165)' : 'var(--fg-2)' }}
                  >
                    {copied ? <Check size={10} /> : <Copy size={10} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <a
                    href={`/play/${settings.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono transition-all hover:bg-[var(--tint-3)]"
                    style={{ border: '1px solid var(--line-2)', color: 'var(--fg-2)' }}
                  >
                    <ExternalLink size={10} />
                    Open
                  </a>
                </div>
                <div className="px-4 pb-3 flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: statusColor(settings.visibility, accessEnabled) }}
                  />
                  <span className="text-[10px] font-mono" style={{ color: 'var(--fg-4)' }}>
                    Currently {!accessEnabled ? 'disabled' : VISIBILITY_OPTIONS.find(o => o.value === settings.visibility)?.label.toLowerCase()}
                  </span>
                </div>
              </div>

              {/* Who can access */}
              <div className="space-y-2">
                <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--fg-3)' }}>Who can access this</p>
                <div className="space-y-1.5">
                  {VISIBILITY_OPTIONS.map(({ value, icon, label, description }) => {
                    const selected = visibility === value
                    return (
                      <button
                        key={value}
                        onClick={() => { setVisibility(value); setSaveError(null) }}
                        className="w-full flex items-start gap-3 px-3.5 py-3 rounded-xl text-left transition-all"
                        style={{
                          background: selected ? 'oklch(82% 0.18 165 / 0.07)' : 'var(--tint-1)',
                          border: `1px solid ${selected ? 'oklch(82% 0.18 165 / 0.4)' : 'var(--line-2)'}`,
                        }}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            background: selected ? 'oklch(82% 0.18 165 / 0.15)' : 'var(--tint-2)',
                            color: selected ? 'oklch(82% 0.18 165)' : 'var(--fg-3)',
                          }}
                        >
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium" style={{ color: selected ? 'var(--fg-0)' : 'var(--fg-1)' }}>{label}</p>
                          <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--fg-3)' }}>{description}</p>
                        </div>
                        <div
                          className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            borderColor: selected ? 'oklch(82% 0.18 165)' : 'var(--line-3)',
                            background: selected ? 'oklch(82% 0.18 165)' : 'transparent',
                          }}
                        >
                          {selected && <div className="w-1.5 h-1.5 rounded-full bg-[#052916]" />}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Password field — only for password mode */}
                <AnimatePresence>
                  {visibility === 'password' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 pt-1">
                        <label className="block text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--fg-3)' }}>
                          Password
                        </label>

                        {settings.hasPassword && !clearPassword && (
                          <div
                            className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl"
                            style={{ background: 'var(--tint-1)', border: '1px solid var(--line-2)' }}
                          >
                            <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--fg-2)' }}>
                              <Lock size={12} style={{ color: 'oklch(82% 0.18 165)' }} />
                              Password is set — viewers must enter it to play
                            </span>
                            <button
                              type="button"
                              onClick={() => setClearPassword(true)}
                              className="shrink-0 text-[10px] font-mono underline underline-offset-2 transition-colors hover:text-ink-1"
                              style={{ color: 'var(--fg-3)' }}
                            >
                              Remove
                            </button>
                          </div>
                        )}

                        {(!settings.hasPassword || clearPassword) && (
                          <>
                            <div
                              className="flex items-center rounded-xl overflow-hidden"
                              style={{ background: 'var(--tint-1)', border: '1px solid var(--line-2)' }}
                            >
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => { setPassword(e.target.value); setClearPassword(false) }}
                                placeholder="Set a password — min. 4 characters"
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
                            {clearPassword && (
                              <button
                                type="button"
                                onClick={() => { setClearPassword(false); setPassword('') }}
                                className="text-[10px] font-mono underline underline-offset-2 transition-colors hover:text-ink-1"
                                style={{ color: 'var(--fg-3)' }}
                              >
                                Cancel — keep current password
                              </button>
                            )}
                          </>
                        )}

                        {needsNewPassword && (
                          <p className="text-[10px] leading-relaxed" style={{ color: 'oklch(80% 0.16 60)' }}>
                            Set a password before viewers can be asked for one.
                          </p>
                        )}
                        {!passwordValid && (
                          <p className="text-[10px] leading-relaxed" style={{ color: 'oklch(70% 0.18 25)' }}>
                            Password must be at least 4 characters.
                          </p>
                        )}
                      </div>

                      {/* Share links — optional escape hatch around the password */}
                      <div className="space-y-2 pt-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--fg-3)' }}>
                            Share links <span style={{ color: 'var(--fg-4)' }}>(skip the password)</span>
                          </p>
                          <button
                            type="button"
                            onClick={handleCreateToken}
                            disabled={creatingToken}
                            className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg transition-all hover:bg-[var(--tint-3)] disabled:opacity-50"
                            style={{ border: '1px solid var(--line-2)', color: 'var(--fg-2)' }}
                          >
                            {creatingToken ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                            New link
                          </button>
                        </div>

                        {tokensLoading && (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--fg-3)' }} />
                          </div>
                        )}

                        {!tokensLoading && tokens && tokens.length === 0 && (
                          <p className="text-[10px] leading-relaxed" style={{ color: 'var(--fg-4)' }}>
                            No share links yet. Create one to let people in without typing the password — perfect for a workshop or a partner.
                          </p>
                        )}

                        {!tokensLoading && tokens && tokens.length > 0 && (
                          <div className="space-y-1.5">
                            {tokens.map(t => (
                              <ShareTokenRow
                                key={t.id}
                                token={t}
                                slug={settings.slug}
                                revoking={revokingId === t.id}
                                onRevoke={() => handleRevokeToken(t.id)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Disable access */}
              <div
                className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl"
                style={{ background: 'var(--tint-1)', border: '1px solid var(--line-2)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: accessEnabled ? 'var(--tint-2)' : 'oklch(70% 0.18 25 / 0.12)',
                      color: accessEnabled ? 'var(--fg-3)' : 'oklch(70% 0.18 25)',
                    }}
                  >
                    <Power size={13} />
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--fg-1)' }}>Access enabled</p>
                    <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--fg-3)' }}>
                      Turn off to instantly hide this scenario from everyone — even people with the link.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={accessEnabled}
                  onClick={() => setAccessEnabled(v => !v)}
                  className="shrink-0 relative w-9 h-5 rounded-full transition-colors"
                  style={{ background: accessEnabled ? 'oklch(82% 0.18 165 / 0.7)' : 'var(--tint-3)' }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                    style={{ left: accessEnabled ? 18 : 2, background: '#0e0f14' }}
                  />
                </button>
              </div>

              {saveError && (
                <p className="text-[11px] font-mono" style={{ color: 'oklch(70% 0.18 25)' }}>{saveError}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="shrink-0 px-5 py-3.5 border-t flex items-center justify-between"
          style={{ borderColor: 'var(--line-1)' }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-mono transition-all hover:bg-[var(--tint-3)] disabled:opacity-50"
            style={{ border: '1px solid var(--line-2)', color: 'var(--fg-3)' }}
          >
            Close
          </button>

          {!settingsChanged && savedAt ? (
            <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'oklch(82% 0.18 165 / 0.75)' }}>
              <Check size={13} />
              Saved
            </div>
          ) : (
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all"
              style={canSave ? {
                background: 'oklch(82% 0.18 165)',
                color: '#052916',
                boxShadow: '0 0 20px oklch(82% 0.18 165 / 0.35)',
              } : {
                background: 'var(--tint-2)',
                color: 'var(--fg-4)',
                border: '1px solid var(--line-1)',
                cursor: 'not-allowed',
              }}
            >
              {saving ? <><Loader2 size={12} className="animate-spin" /> Saving…</> : <><Shield size={12} /> Save changes</>}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function ShareTokenRow({
  token, slug, revoking, onRevoke,
}: {
  token: ShareToken
  slug: string
  revoking: boolean
  onRevoke: () => void
}) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/play/${slug}?token=${token.token}`
    : `/play/${slug}?token=${token.token}`

  const isRevoked = !!token.revokedAt
  const isExpired = !!token.expiresAt && new Date(token.expiresAt).getTime() < Date.now()
  const isActive = !isRevoked && !isExpired

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked */ }
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
      style={{ background: 'var(--tint-1)', border: '1px solid var(--line-1)' }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: isActive ? 'oklch(82% 0.18 165)' : 'var(--fg-4)' }}
      />
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[11px] truncate" style={{ color: isActive ? 'var(--fg-1)' : 'var(--fg-4)' }}>
          ?token={token.token.slice(0, 10)}…
        </p>
        <p className="text-[9px] font-mono mt-0.5" style={{ color: 'var(--fg-4)' }}>
          {isRevoked ? 'Revoked' : isExpired ? 'Expired' : `Used ${token.useCount}×`}
        </p>
      </div>
      {isActive && (
        <button
          onClick={handleCopy}
          className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono transition-all hover:bg-[var(--tint-3)]"
          style={{ border: '1px solid var(--line-2)', color: copied ? 'oklch(82% 0.18 165)' : 'var(--fg-2)' }}
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      )}
      {isActive && (
        <button
          onClick={onRevoke}
          disabled={revoking}
          className="shrink-0 p-1.5 rounded-lg transition-all hover:bg-[var(--tint-3)] disabled:opacity-50"
          style={{ color: 'oklch(70% 0.18 25)' }}
          aria-label="Revoke share link"
        >
          {revoking ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
        </button>
      )}
    </div>
  )
}
