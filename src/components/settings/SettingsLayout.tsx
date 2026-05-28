'use client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SettingsNav, type SettingsSectionId } from './SettingsNav'

interface Props {
  activeSection: SettingsSectionId
  onSectionChange: (id: SettingsSectionId) => void
  children: React.ReactNode
}

export function SettingsLayout({ activeSection, onSectionChange, children }: Props) {
  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: 'var(--bg-canvas)', color: 'var(--fg-0)' }}
    >
      {/* Header */}
      <header
        className="h-[52px] flex items-center gap-4 px-6 border-b shrink-0"
        style={{ borderColor: 'var(--line-1)', background: 'var(--bg-0)' }}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs font-mono transition-colors"
          style={{ color: 'var(--fg-4)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg-1)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-4)')}
        >
          <ArrowLeft size={12} />
          Dashboard
        </Link>
        <span style={{ color: 'var(--line-2)' }}>/</span>
        <span className="text-sm font-semibold" style={{ color: 'var(--fg-0)' }}>Settings</span>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className="w-[220px] shrink-0 border-r px-3 overflow-y-auto hidden md:block"
          style={{ borderColor: 'var(--line-1)', background: 'var(--bg-0)' }}
        >
          <SettingsNav active={activeSection} onChange={onSectionChange} />
        </aside>

        {/* Mobile nav pills */}
        <div
          className="md:hidden flex overflow-x-auto gap-1.5 px-4 py-2 border-b shrink-0"
          style={{ borderColor: 'var(--line-1)' }}
        >
          {/* Rendered inline in page for mobile — handled by SettingsNav scroll */}
        </div>

        {/* Main panel */}
        <main className="flex-1 overflow-y-auto px-6 py-8 pb-24 max-w-2xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
