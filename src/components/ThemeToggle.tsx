'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/lib/theme'

export function ThemeToggle({ className }: { className?: string }) {
  const { isDark, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:scale-105 active:scale-95 ${className ?? ''}`}
      style={{
        background: 'var(--tint-2)',
        border: '1px solid var(--line-2)',
        color: 'var(--fg-3)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = 'var(--fg-1)'
        e.currentTarget.style.borderColor = 'var(--line-4)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = 'var(--fg-3)'
        e.currentTarget.style.borderColor = 'var(--line-2)'
      }}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  )
}
