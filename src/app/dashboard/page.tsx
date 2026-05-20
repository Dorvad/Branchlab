'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, GitBranch, Layers } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { ScenarioCard } from '@/components/dashboard/ScenarioCard'
import {
  getAllScenarios,
  createScenario,
  createFromTemplate,
  duplicateScenario,
  deleteScenario,
  saveScenario,
} from '@/lib/local-store'
import type { Scenario } from '@/types'

export default function DashboardPage() {
  const router = useRouter()

  // Lazy init: reads localStorage synchronously — no flash or loading state
  const [scenarios, setScenarios] = useState<Scenario[]>(() => {
    if (typeof window === 'undefined') return []
    return getAllScenarios()
  })

  const refresh = () => setScenarios(getAllScenarios())

  const handleCreate = () => {
    const s = createScenario()
    saveScenario(s)
    router.push(`/editor/${s.id}`)
  }

  const handleCreateFromTemplate = () => {
    const s = createFromTemplate()
    saveScenario(s)
    router.push(`/editor/${s.id}`)
  }

  const handleDuplicate = (source: Scenario) => {
    const copy = duplicateScenario(source)
    saveScenario(copy)
    refresh()
  }

  const handleDelete = (id: string) => {
    const target = scenarios.find(s => s.id === id)
    if (!target) return
    if (!window.confirm(`Delete "${target.title}"? This cannot be undone.`)) return
    deleteScenario(id)
    refresh()
  }

  const published = scenarios.filter(s => s.status === 'published')
  const drafts = scenarios.filter(s => s.status !== 'published')

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
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all hover:bg-white/5"
              style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#c9cdda' }}
            >
              <Plus size={14} />
              Blank
            </button>
            <button
              onClick={handleCreateFromTemplate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:brightness-110"
              style={{
                background: 'var(--neon-mint)',
                color: '#052916',
                boxShadow: 'var(--glow-mint)',
              }}
            >
              <Layers size={14} />
              New Scenario
            </button>
          </div>
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
            {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''} · {published.length} published
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {scenarios.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <EmptyState onCreate={handleCreate} onCreateFromTemplate={handleCreateFromTemplate} />
            </motion.div>
          ) : (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {published.length > 0 && (
                <section className="mb-12">
                  <SectionLabel>Published</SectionLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
                    {published.map((s, i) => (
                      <ScenarioCard
                        key={s.id}
                        scenario={s}
                        index={i}
                        onDuplicate={() => handleDuplicate(s)}
                        onDelete={() => handleDelete(s.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {drafts.length > 0 && (
                <section>
                  <SectionLabel>Drafts</SectionLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
                    {drafts.map((s, i) => (
                      <ScenarioCard
                        key={s.id}
                        scenario={s}
                        index={published.length + i}
                        onDuplicate={() => handleDuplicate(s)}
                        onDelete={() => handleDelete(s.id)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({
  onCreate,
  onCreateFromTemplate,
}: {
  onCreate: () => void
  onCreateFromTemplate: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      {/* Graph icon */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <GitBranch size={32} style={{ color: '#3a3f4e' }} />
      </div>

      <h2 className="text-lg font-semibold text-ink-0 mb-2">No scenarios yet</h2>
      <p className="text-sm text-ink-3 max-w-[340px] leading-relaxed mb-8">
        Build a branching video scenario — a flow of scenes, choices, and outcomes that players navigate.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-all hover:bg-white/5"
          style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#c9cdda' }}
        >
          <Plus size={14} />
          Blank scenario
        </button>
        <button
          onClick={onCreateFromTemplate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:brightness-110"
          style={{
            background: 'oklch(82% 0.18 165 / 0.12)',
            border: '1px solid oklch(82% 0.18 165 / 0.3)',
            color: 'oklch(82% 0.18 165)',
          }}
        >
          <Layers size={14} />
          Start from template
        </button>
      </div>

      <p className="text-[11px] text-ink-4 mt-6 font-mono">
        Template gives you a start node, two paths, and an ending — ready to edit.
      </p>
    </div>
  )
}

// ── Shared ─────────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono text-ink-3 tracking-widest uppercase">{children}</span>
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  )
}
