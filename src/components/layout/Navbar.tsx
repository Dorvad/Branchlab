'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavbarProps {
  title?: string
  actions?: React.ReactNode
}

export function Navbar({ title, actions }: NavbarProps) {
  const pathname = usePathname()
  const isDashboard = pathname === '/dashboard'

  return (
    <header
      className="flex items-center justify-between px-6 py-4 border-b"
      style={{ borderColor: 'var(--stroke)', background: 'rgba(8,9,13,0.85)', backdropFilter: 'blur(16px)' }}
    >
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <svg width="26" height="26" viewBox="0 0 44 44" fill="none">
            <circle cx="10" cy="22" r="5" fill="oklch(82% 0.18 165)" />
            <circle cx="34" cy="10" r="4" fill="oklch(78% 0.18 285)" />
            <circle cx="34" cy="34" r="4" fill="oklch(80% 0.16 60)" />
            <path d="M14 22 L30 12 M14 22 L30 32" stroke="white" strokeOpacity="0.4" strokeWidth="1.5" />
          </svg>
          <span className="font-semibold text-sm tracking-[-0.01em] text-ink-0">BranchLab</span>
        </Link>

        {title && (
          <>
            <span className="text-ink-4 text-sm">/</span>
            <span className="text-sm text-ink-1 truncate max-w-xs">{title}</span>
          </>
        )}

        {isDashboard && (
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/dashboard"
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                'text-ink-1 hover:text-ink-0 hover:bg-white/5'
              )}
            >
              Scenarios
            </Link>
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">{actions}</div>
    </header>
  )
}
