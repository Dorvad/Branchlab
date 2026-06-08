'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Settings, Users, Mail, Copy, Check,
  Trash2, ChevronDown, Loader2, X, Plus,
} from 'lucide-react'
import Link from 'next/link'
import {
  getOrg, getOrgMembers, getOrgInvites, updateOrgName,
  inviteMember, revokeInvite, removeMember, updateMemberRole,
} from '@/lib/supabase/orgs'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { OrgMember, OrgInvite, OrgRole } from '@/types'

const ROLES: OrgRole[] = ['admin', 'member', 'viewer']

function RoleBadge({ role }: { role: OrgRole }) {
  const colors: Record<OrgRole, { bg: string; text: string }> = {
    owner:  { bg: 'oklch(82% 0.18 165 / 0.12)', text: 'oklch(82% 0.18 165)' },
    admin:  { bg: 'oklch(78% 0.18 285 / 0.12)', text: 'oklch(78% 0.18 285)' },
    member: { bg: 'var(--tint-3)', text: 'var(--fg-2)' },
    viewer: { bg: 'var(--tint-2)', text: 'var(--fg-4)' },
  }
  const { bg, text } = colors[role] ?? colors.member
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-mono capitalize"
      style={{ background: bg, color: text }}
    >
      {role}
    </span>
  )
}

export default function OrgSettingsPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const router = useRouter()

  const [orgName, setOrgName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [members, setMembers] = useState<OrgMember[]>([])
  const [invites, setInvites] = useState<OrgInvite[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<OrgRole>('member')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  const [myRole, setMyRole] = useState<OrgRole | null>(null)
  const isAdmin = myRole === 'owner' || myRole === 'admin'

  const load = useCallback(async () => {
    setLoadingMembers(true)
    try {
      const [m, i] = await Promise.all([getOrgMembers(orgId), getOrgInvites(orgId)])
      setMembers(m)
      setInvites(i)
    } finally {
      setLoadingMembers(false)
    }
  }, [orgId])

  useEffect(() => {
    const sb = getSupabaseClient()
    sb.auth.getUser().then(res => {
      const uid = res.data.user?.id ?? null
      setCurrentUserId(uid)
    })
    load()
  }, [load])

  // Derive myRole from members list once it loads
  useEffect(() => {
    if (!currentUserId || members.length === 0) return
    const me = members.find(m => m.userId === currentUserId)
    if (me) setMyRole(me.role)
  }, [members, currentUserId])

  useEffect(() => {
    let cancelled = false
    getOrg(orgId).then(org => {
      if (!cancelled && org) setOrgName(org.name)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [orgId])

  const handleSaveName = async () => {
    if (!nameInput.trim() || nameInput === orgName) { setEditingName(false); return }
    setSavingName(true)
    try {
      await updateOrgName(orgId, nameInput.trim())
      setOrgName(nameInput.trim())
      setEditingName(false)
    } catch { /* ignore */ } finally {
      setSavingName(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteError(null)
    try {
      const link = await inviteMember(orgId, inviteEmail.trim(), inviteRole)
      await navigator.clipboard.writeText(link).catch(() => {})
      setCopiedLink(link)
      setInviteEmail('')
      await load()
      setTimeout(() => setCopiedLink(null), 8000)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  const handleRevoke = async (inviteId: string) => {
    await revokeInvite(inviteId).catch(() => {})
    await load()
  }

  const handleRemoveMember = async (userId: string) => {
    await removeMember(orgId, userId).catch(() => {})
    await load()
  }

  const handleRoleChange = async (userId: string, role: OrgRole) => {
    await updateMemberRole(orgId, userId, role).catch(() => {})
    await load()
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-0)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-6 h-[52px] border-b"
        style={{ borderColor: 'var(--line-1)', background: 'var(--bg-glass)', backdropFilter: 'blur(16px)' }}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs transition-colors hover:text-[var(--fg-1)]"
          style={{ color: 'var(--fg-3)' }}
        >
          <ArrowLeft size={13} />
          Dashboard
        </Link>
        <div style={{ width: 1, height: 14, background: 'var(--line-2)' }} />
        <Settings size={13} style={{ color: 'var(--fg-4)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--fg-0)' }}>
          {orgName || 'Workspace settings'}
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">

        {/* ── General ── */}
        <section>
          <h2 className="text-xs font-mono tracking-widest uppercase mb-4" style={{ color: 'var(--fg-3)' }}>General</h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line-1)', background: 'var(--bg-1)' }}>
            <div className="p-5">
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--fg-2)' }}>
                Workspace name
              </label>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                    className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--tint-2)', border: '1px solid var(--line-2)', color: 'var(--fg-0)' }}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                    style={{ background: 'oklch(82% 0.18 165)', color: '#052916' }}
                  >
                    {savingName ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Save
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="px-3 py-2 rounded-xl text-xs transition-colors hover:bg-[var(--tint-2)]"
                    style={{ color: 'var(--fg-3)' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm" style={{ color: 'var(--fg-1)' }}>{orgName || '—'}</p>
                  {isAdmin && (
                    <button
                      onClick={() => { setNameInput(orgName); setEditingName(true) }}
                      className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-[var(--tint-2)]"
                      style={{ color: 'var(--fg-3)' }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Members ── */}
        <section>
          <h2 className="text-xs font-mono tracking-widest uppercase mb-4" style={{ color: 'var(--fg-3)' }}>Members</h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line-1)', background: 'var(--bg-1)' }}>
            {loadingMembers ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={20} className="animate-spin" style={{ color: 'var(--fg-4)' }} />
              </div>
            ) : (
              members.map((member, i) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 px-5 py-3.5"
                  style={{ borderBottom: i < members.length - 1 ? '1px solid var(--line-1)' : 'none' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{ background: 'var(--tint-2)', color: 'var(--fg-2)' }}
                  >
                    {(member.email ?? member.userId).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: 'var(--fg-1)' }}>
                      {member.email ?? member.userId}
                    </p>
                    <p className="text-[10px] font-mono" style={{ color: 'var(--fg-4)' }}>
                      Joined {new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {isAdmin && member.userId !== currentUserId && member.role !== 'owner' ? (
                    <RoleSelect
                      value={member.role}
                      onChange={role => handleRoleChange(member.userId, role)}
                    />
                  ) : (
                    <RoleBadge role={member.role} />
                  )}

                  {isAdmin && member.userId !== currentUserId && member.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:bg-[oklch(70%_0.18_25_/_0.1)]"
                      style={{ color: 'oklch(70% 0.18 25)' }}
                      title="Remove member"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── Invite ── */}
        {isAdmin && (
          <section>
            <h2 className="text-xs font-mono tracking-widest uppercase mb-4" style={{ color: 'var(--fg-3)' }}>
              Invite members
            </h2>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line-1)', background: 'var(--bg-1)' }}>
              <form onSubmit={handleInvite} className="p-5 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="flex-1 px-3.5 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--tint-2)', border: '1px solid var(--line-2)', color: 'var(--fg-0)' }}
                  />
                  <RoleSelect value={inviteRole} onChange={setInviteRole} compact />
                  <button
                    type="submit"
                    disabled={!inviteEmail.trim() || inviting}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                    style={{ background: 'oklch(82% 0.18 165)', color: '#052916' }}
                  >
                    {inviting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    Invite
                  </button>
                </div>
                {inviteError && (
                  <p className="text-xs" style={{ color: 'oklch(70% 0.18 25)' }}>{inviteError}</p>
                )}
              </form>

              {/* Copied link toast */}
              <AnimatePresence>
                {copiedLink && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className="mx-5 mb-4 px-4 py-3 rounded-xl space-y-1.5"
                    style={{ background: 'oklch(82% 0.18 165 / 0.08)', border: '1px solid oklch(82% 0.18 165 / 0.25)' }}
                  >
                    <div className="flex items-center gap-2">
                      <Check size={13} style={{ color: 'oklch(82% 0.18 165)' }} />
                      <p className="text-xs font-medium" style={{ color: 'oklch(82% 0.18 165)' }}>Invite link copied to clipboard</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] font-mono truncate flex-1" style={{ color: 'var(--fg-3)' }}>{copiedLink}</p>
                      <button
                        onClick={() => navigator.clipboard.writeText(copiedLink).catch(() => {})}
                        className="shrink-0"
                        style={{ color: 'var(--fg-4)' }}
                        title="Copy again"
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Pending invites */}
              {invites.length > 0 && (
                <>
                  <div style={{ height: 1, background: 'var(--line-1)', margin: '0 0 0 0' }} />
                  <p className="px-5 pt-3 pb-1 text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--fg-4)' }}>
                    Pending invites
                  </p>
                  {invites.map((invite, i) => (
                    <div
                      key={invite.id}
                      className="flex items-center gap-3 px-5 py-3"
                      style={{ borderTop: i > 0 ? '1px solid var(--line-1)' : 'none' }}
                    >
                      <Mail size={14} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate" style={{ color: 'var(--fg-1)' }}>{invite.email}</p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--fg-4)' }}>
                          Expires {new Date(invite.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <RoleBadge role={invite.role} />
                      <button
                        onClick={() => navigator.clipboard.writeText(
                          `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/accept-invite/${invite.token}`
                        ).catch(() => {})}
                        className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--tint-2)]"
                        style={{ color: 'var(--fg-3)' }}
                        title="Copy invite link"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        onClick={() => handleRevoke(invite.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:bg-[oklch(70%_0.18_25_/_0.1)]"
                        style={{ color: 'oklch(70% 0.18 25)' }}
                        title="Revoke invite"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

// ── RoleSelect ────────────────────────────────────────────────────────────────

function RoleSelect({
  value, onChange, compact = false,
}: {
  value: OrgRole
  onChange: (r: OrgRole) => void
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs capitalize transition-colors"
        style={{ background: 'var(--tint-2)', border: '1px solid var(--line-2)', color: 'var(--fg-2)' }}
      >
        {compact ? value : value}
        <ChevronDown size={10} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-50"
            style={{
              background: 'var(--bg-1)',
              border: '1px solid var(--line-2)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              minWidth: 120,
            }}
          >
            {ROLES.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => { onChange(r); setOpen(false) }}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 text-xs capitalize transition-colors hover:bg-[var(--tint-2)]"
                style={{ color: value === r ? 'var(--fg-0)' : 'var(--fg-2)' }}
              >
                {r}
                {value === r && <Check size={11} style={{ color: 'oklch(82% 0.18 165)' }} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
