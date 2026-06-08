'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react'

interface PasswordGateProps {
  slug: string
}

// The scenario must not load behind this gate — we only ever ask the server
// to verify the password (it never returns scenario content here). On
// success the server sets a signed cookie and we refresh the server
// component, which re-resolves access and renders the player.
export function PasswordGate({ slug }: PasswordGateProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/play/${encodeURIComponent(slug)}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Incorrect password')
        setSubmitting(false)
        return
      }
      router.refresh()
    } catch {
      setError('Something went wrong — please try again')
      setSubmitting(false)
    }
  }

  return (
    <div
      className="flex h-screen items-center justify-center p-6"
      style={{ background: '#0a0b10' }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[340px] flex flex-col items-center gap-5 text-center"
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: 'oklch(82% 0.18 165 / 0.1)', border: '1px solid oklch(82% 0.18 165 / 0.25)' }}
        >
          <Lock size={18} style={{ color: 'oklch(82% 0.18 165)' }} />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: '#c9cdda' }}>This scenario is password-protected</p>
          <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: '#5c6273' }}>
            Enter the password the creator shared with you to start watching.
          </p>
        </div>

        <div
          className="w-full flex items-center rounded-xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${error ? 'oklch(70% 0.18 25 / 0.5)' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          <input
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null) }}
            placeholder="Password"
            autoFocus
            className="flex-1 bg-transparent py-3 px-4 text-sm outline-none"
            style={{ color: '#e7e9f0' }}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="px-3 transition-colors"
            style={{ color: '#5c6273' }}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        {error && (
          <p className="text-[11px] font-mono -mt-2" style={{ color: 'oklch(70% 0.18 25)' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={!password || submitting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'oklch(82% 0.18 165)', color: '#052916' }}
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
          {submitting ? 'Checking…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
