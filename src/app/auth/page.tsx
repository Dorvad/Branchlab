'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { GitBranch, Eye, EyeOff } from 'lucide-react'
import { signIn, signUp } from '@/lib/supabase/auth'

type Mode = 'signin' | 'signup'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        if (mode === 'signin') {
          await signIn(email, password)
        } else {
          await signUp(email, password)
        }
        router.push('/dashboard')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  const toggle = () => {
    setMode(m => m === 'signin' ? 'signup' : 'signin')
    setError(null)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg-0)' }}
    >
      {/* Background glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: 'radial-gradient(600px 400px at 50% 0%, oklch(78% 0.18 285 / 0.05) 0%, transparent 60%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'oklch(82% 0.18 165 / 0.12)', border: '1px solid oklch(82% 0.18 165 / 0.3)' }}
          >
            <GitBranch size={15} style={{ color: 'oklch(82% 0.18 165)' }} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-ink-0">BranchLab</span>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: 'var(--tint-1)',
            border: '1px solid var(--line-2)',
          }}
        >
          <h1 className="text-base font-semibold text-ink-0 mb-1">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h1>
          <p className="text-xs text-ink-3 mb-6">
            {mode === 'signin' ? 'Welcome back.' : 'Start building branching scenarios.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-mono text-ink-3 mb-1.5 uppercase tracking-widest">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
                style={{
                  background: 'var(--tint-2)',
                  border: '1px solid var(--line-2)',
                  color: 'var(--fg-1)',
                }}
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-ink-3 mb-1.5 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all pr-10"
                  style={{
                    background: 'var(--tint-2)',
                    border: '1px solid var(--line-2)',
                    color: 'var(--fg-1)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-1 transition-colors"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-mono"
                style={{ color: 'oklch(70% 0.2 25)' }}
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 rounded-xl text-sm font-medium transition-all hover:brightness-110 disabled:opacity-50 mt-1"
              style={{
                background: 'var(--neon-mint)',
                color: '#052916',
                boxShadow: isPending ? 'none' : 'var(--glow-mint)',
              }}
            >
              {isPending
                ? mode === 'signin' ? 'Signing in…' : 'Creating account…'
                : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-ink-3 mt-4">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={toggle}
            className="text-ink-1 hover:text-ink-0 transition-colors underline underline-offset-2"
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </motion.div>
    </div>
  )
}
