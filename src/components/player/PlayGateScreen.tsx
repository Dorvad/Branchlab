'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Lock, EyeOff, ShieldOff, SearchX } from 'lucide-react'

const ICONS = {
  'not-found': SearchX,
  disabled: ShieldOff,
  denied: Lock,
  private: EyeOff,
} as const

export type GateKind = keyof typeof ICONS

const COPY: Record<GateKind, { title: string; body: string }> = {
  'not-found': {
    title: 'Nothing here yet',
    body: 'There is no scenario published at this address. Check the link, or ask the creator for a fresh one.',
  },
  disabled: {
    title: 'This scenario is currently unavailable',
    body: 'The creator has temporarily turned off access. Please check back later.',
  },
  denied: {
    title: 'Access denied',
    body: 'You do not have permission to view this scenario.',
  },
  private: {
    title: 'Access denied',
    body: 'This scenario is private. Only its creator can view it — sign in with the creator account to continue.',
  },
}

export function PlayGateScreen({ kind, children }: { kind: GateKind; children?: ReactNode }) {
  const Icon = ICONS[kind]
  const { title, body } = COPY[kind]

  return (
    <div
      className="flex h-screen items-center justify-center p-6"
      style={{ background: '#0a0b10' }}
    >
      <div className="flex flex-col items-center gap-4 text-center max-w-[360px]">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Icon size={20} style={{ color: '#5c6273' }} />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: '#c9cdda' }}>{title}</p>
          <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: '#5c6273' }}>{body}</p>
        </div>
        {children}
        <Link
          href="/"
          className="text-xs font-mono underline underline-offset-4 transition-colors mt-1"
          style={{ color: '#5c6273' }}
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
