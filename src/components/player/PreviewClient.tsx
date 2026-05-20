'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { ScenarioPlayer } from './ScenarioPlayer'
import { getScenario } from '@/lib/scenario-store'
import type { Scenario } from '@/types'

interface PreviewClientProps {
  scenarioId: string
}

export function PreviewClient({ scenarioId }: PreviewClientProps) {
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getScenario(scenarioId).then(s => {
      setScenario(s)
      setLoading(false)
    })
  }, [scenarioId])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: '#0a0b10' }}>
        <Loader2 size={22} className="animate-spin text-ink-3" />
      </div>
    )
  }

  if (!scenario) {
    return (
      <div
        className="flex h-screen items-center justify-center flex-col gap-4"
        style={{ background: '#0a0b10' }}
      >
        <p className="text-sm font-mono" style={{ color: '#5c6273' }}>Scenario not found.</p>
        <Link
          href="/dashboard"
          className="text-xs font-mono underline underline-offset-4 transition-colors"
          style={{ color: '#5c6273' }}
        >
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <ScenarioPlayer
      scenario={scenario}
      mode="preview"
      backHref={`/editor/${scenarioId}`}
    />
  )
}
