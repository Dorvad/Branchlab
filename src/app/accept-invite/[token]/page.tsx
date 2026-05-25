'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, Users, CheckCircle, AlertCircle, GitBranch } from 'lucide-react'
import Link from 'next/link'
import { getInviteByToken, acceptInvite } from '@/lib/supabase/orgs'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { OrgInvite } from '@/types'

type PageState = 'loading' | 'preview' | 'auth-required' | 'joining' | 'success' | 'error'

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const [state, setState] = useState<PageState>('loading')
  const [invite, setInvite] = useState<(OrgInvite & { orgName: string }) | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    async function init() {
      // Check auth first
      const sb = getSupabaseClient()
      const { data: { user } } = await sb.auth.getUser()
      setIsAuthed(!!user)

      // Load invite details (no auth required for preview)
      const inv = await getInviteByToken(token)
      if (!inv) {
        setErrorMsg('This invite link is invalid, has expired, or has already been used.')
        setState('error')
        return
      }

      setInvite(inv)

      if (!user) {
        setState('auth-required')
      } else {
        setState('preview')
      }
    }
    void init()
  }, [token])

  const handleJoin = async () => {
    setState('joining')
    try {
      await acceptInvite(token)
      setState('success')
      setTimeout(() => router.push('/dashboard'), 2500)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to join workspace')
      setState('error')
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'var(--bg-0)' }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-12">
        <svg width="20" height="20" viewBox="0 0 44 44" fill="none">
          <circle cx="10" cy="22" r="5" fill="oklch(82% 0.18 165)" />
          <circle cx="34" cy="10" r="4" fill="oklch(78% 0.18 285)" />
          <circle cx="34" cy="34" r="4" fill="oklch(80% 0.16 60)" />
          <path d="M14 22 L30 12 M14 22 L30 32" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" />
        </svg>
        <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--fg-0)' }}>BranchLab</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--line-2)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        }}
      >
        {state === 'loading' && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin" style={{ color: 'var(--fg-4)' }} />
          </div>
        )}

        {(state === 'preview' || state === 'joining') && invite && (
          <div className="p-8 flex flex-col items-center text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 text-lg font-bold"
              style={{ background: 'oklch(78% 0.18 285 / 0.15)', color: 'oklch(78% 0.18 285)' }}
            >
              {invite.orgName.slice(0, 2).toUpperCase()}
            </div>
            <p className="text-xs font-mono tracking-widest uppercase mb-2" style={{ color: 'var(--fg-4)' }}>
              You&apos;re invited to
            </p>
            <h1 className="text-xl font-semibold mb-1.5" style={{ color: 'var(--fg-0)' }}>
              {invite.orgName}
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--fg-3)' }}>
              You&apos;ll join as a <span className="font-medium capitalize" style={{ color: 'var(--fg-1)' }}>{invite.role}</span>
            </p>
            <button
              onClick={handleJoin}
              disabled={state === 'joining'}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
              style={{
                background: 'oklch(82% 0.18 165)',
                color: '#052916',
                boxShadow: state === 'joining' ? 'none' : '0 0 20px oklch(82% 0.18 165 / 0.3)',
              }}
            >
              {state === 'joining' ? (
                <><Loader2 size={14} className="animate-spin" /> Joining…</>
              ) : (
                <><Users size={14} /> Join {invite.orgName}</>
              )}
            </button>
          </div>
        )}

        {state === 'auth-required' && invite && (
          <div className="p-8 flex flex-col items-center text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 text-lg font-bold"
              style={{ background: 'oklch(78% 0.18 285 / 0.15)', color: 'oklch(78% 0.18 285)' }}
            >
              {invite.orgName.slice(0, 2).toUpperCase()}
            </div>
            <p className="text-xs font-mono tracking-widest uppercase mb-2" style={{ color: 'var(--fg-4)' }}>
              Invited to
            </p>
            <h1 className="text-xl font-semibold mb-1.5" style={{ color: 'var(--fg-0)' }}>{invite.orgName}</h1>
            <p className="text-sm mb-6" style={{ color: 'var(--fg-3)' }}>
              Sign in to accept this invite and join as a{' '}
              <span className="font-medium capitalize" style={{ color: 'var(--fg-1)' }}>{invite.role}</span>.
            </p>
            <Link
              href={`/auth?redirect=/accept-invite/${token}`}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: 'oklch(82% 0.18 165)',
                color: '#052916',
                boxShadow: '0 0 20px oklch(82% 0.18 165 / 0.3)',
              }}
            >
              Sign in to continue
            </Link>
          </div>
        )}

        {state === 'success' && invite && (
          <div className="p-8 flex flex-col items-center text-center">
            <CheckCircle size={40} className="mb-4" style={{ color: 'oklch(82% 0.18 165)' }} />
            <h2 className="text-lg font-semibold mb-1.5" style={{ color: 'var(--fg-0)' }}>
              You&apos;re in!
            </h2>
            <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
              Welcome to <span className="font-medium" style={{ color: 'var(--fg-1)' }}>{invite.orgName}</span>.
              Redirecting to dashboard…
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="p-8 flex flex-col items-center text-center">
            <AlertCircle size={36} className="mb-4" style={{ color: 'oklch(70% 0.18 25)' }} />
            <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--fg-0)' }}>
              Invite unavailable
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--fg-3)' }}>{errorMsg}</p>
            <Link
              href="/dashboard"
              className="text-xs underline underline-offset-2"
              style={{ color: 'var(--fg-4)' }}
            >
              Go to dashboard
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  )
}
