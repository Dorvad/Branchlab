'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ScenarioPlayer } from './ScenarioPlayer'
import { getLocalScenario } from '@/lib/local-store'
import type { Scenario } from '@/types'

interface PreviewShellProps {
  scenarioId: string
  initialScenario: Scenario | null
}

export function PreviewShell({ scenarioId, initialScenario }: PreviewShellProps) {
  const [scenario] = useState<Scenario | null>(() => {
    if (typeof window === 'undefined') return initialScenario
    return getLocalScenario(scenarioId) ?? initialScenario
  })

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
