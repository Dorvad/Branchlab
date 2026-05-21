'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, GitBranch, Layers, Loader2 } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { ScenarioCard } from '@/components/dashboard/ScenarioCard'
import {
  getAllScenarios,
  getScenario,
  saveScenario,
  deleteScenario,
  createScenario,
  createFromTemplate,
  duplicateScenario,
} from '@/lib/scenario-store'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Scenario } from '@/types'

export default function DashboardPage() {
  const router = useRouter()
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Auth guard + initial load
  useEffect(() => {
    const sb = getSupabaseClient()
    sb.auth.getUser().then(res => {
      const user = res.data?.user
      if (!user) {
        router.replace('/auth')
        return
      }
      load()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = () => {
    setError(null)
    getAllScenarios()
      .then(setScenarios)
      .catch(e => setError(e.message ?? 'Failed to load scenarios'))
      .finally(() => setLoading(false))
  }

  const handleCreate = () => {
    startTransition(async () => {
      const s = createScenario()
      await saveScenario(s)
      router.push(`/editor/${s.id}`)
    })
  }

  const handleCreateFromTemplate = () => {
    startTransition(async () => {
      const s = createFromTemplate()
      await saveScenario(s)
      router.push(`/editor/${s.id}`)
    })
  }

  const handleDuplicate = async (source: Scenario) => {
    const copy = duplicateScenario(source)
    await saveScenario(copy)
    load()
  }

  const handleDelete = async (id: string) => {
    const target = scenarios.find(s => s.id === id)
    if (!target) return
    if (!window.confirm(`Delete "${target.title}"? This cannot be undone.`)) return
    await deleteScenario(id)
    load()
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
        showSignOut
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all hover:bg-[var(--tint-3)] disabled:opacity-50"
              style={{ borderColor: 'var(--line-2)', color: 'var(--fg-1)' }}
            >
              <Plus size={14} />
              Blank
            </button>
            <button
              onClick={handleCreateFromTemplate}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:brightness-110 disabled:opacity-50"
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
          {!loading && (
            <p className="text-sm text-ink-2 mt-1">
              {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''} · {published.length} published
            </p>
          )}
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={22} className="animate-spin text-ink-3" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-24 text-center gap-3">
            <p className="text-sm text-ink-2">{error}</p>
            <button
              onClick={load}
              className="text-xs text-ink-3 hover:text-ink-1 underline underline-offset-2 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
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
        )}
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
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'var(--tint-1)', border: '1px solid var(--line-1)' }}
      >
        <GitBranch size={32} style={{ color: 'var(--fg-4)' }} />
      </div>

      <h2 className="text-lg font-semibold text-ink-0 mb-2">No scenarios yet</h2>
      <p className="text-sm text-ink-3 max-w-[340px] leading-relaxed mb-8">
        Build a branching video scenario — a flow of scenes, choices, and outcomes that players navigate.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-all hover:bg-[var(--tint-3)]"
          style={{ borderColor: 'var(--line-3)', color: 'var(--fg-1)' }}
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
      <div className="flex-1 h-px" style={{ background: 'var(--line-1)' }} />
    </div>
  )
}
