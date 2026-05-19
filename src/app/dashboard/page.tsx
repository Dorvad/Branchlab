'use client'

import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { ScenarioCard } from '@/components/dashboard/ScenarioCard'
import { mockScenarios } from '@/data/mock-scenarios'

export default function DashboardPage() {
  const published = mockScenarios.filter(s => s.status === 'published')
  const drafts = mockScenarios.filter(s => s.status === 'draft')

  return (
    <div className="min-h-screen bg-bg-0">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(700px 400px at 100% 0%, oklch(78% 0.18 285 / 0.06) 0%, transparent 60%)',
        }}
      />

      <Navbar
        actions={
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:brightness-110"
            style={{
              background: 'var(--neon-mint)',
              color: '#052916',
              boxShadow: 'var(--glow-mint)',
            }}
            onClick={() => alert('New scenario — coming next!')}
          >
            <Plus size={15} />
            New Scenario
          </button>
        }
      />

      <main className="relative max-w-7xl mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink-0">My Scenarios</h1>
          <p className="text-sm text-ink-2 mt-1">
            {mockScenarios.length} scenario{mockScenarios.length !== 1 ? 's' : ''} · {published.length} published
          </p>
        </motion.div>

        {published.length > 0 && (
          <section className="mb-12">
            <SectionLabel>Published</SectionLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
              {published.map((s, i) => (
                <ScenarioCard key={s.id} scenario={s} index={i} />
              ))}
            </div>
          </section>
        )}

        {drafts.length > 0 && (
          <section>
            <SectionLabel>Drafts</SectionLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
              {drafts.map((s, i) => (
                <ScenarioCard key={s.id} scenario={s} index={published.length + i} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono text-ink-3 tracking-widest uppercase">{children}</span>
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  )
}
