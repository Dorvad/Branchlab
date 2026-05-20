'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ScenarioPlayer } from './ScenarioPlayer'
import { getPublishedBySlug } from '@/lib/local-store'
import type { ScenarioVersion } from '@/types'

interface PlayPageClientProps {
  slug: string
  /** Server-provided fallback for statically known slugs (mock data). */
  fallback: ScenarioVersion | null
}

export function PlayPageClient({ slug, fallback }: PlayPageClientProps) {
  // Synchronous lazy init: prefer localStorage version over server fallback.
  // This means a republish (new snapshot) is visible immediately without a
  // full rebuild, while the mock scenario still works on first visit.
  const [version] = useState<ScenarioVersion | null>(() => {
    if (typeof window === 'undefined') return fallback
    return getPublishedBySlug(slug) ?? fallback
  })

  if (!version) {
    return (
      <div
        className="flex h-screen items-center justify-center flex-col gap-4"
        style={{ background: '#0a0b10' }}
      >
        <p className="text-sm font-mono" style={{ color: '#5c6273' }}>
          No scenario published at <span style={{ color: '#c9cdda' }}>/play/{slug}</span>
        </p>
        <Link
          href="/"
          className="text-xs font-mono underline underline-offset-4 transition-colors"
          style={{ color: '#5c6273' }}
        >
          Go home
        </Link>
      </div>
    )
  }

  return <ScenarioPlayer scenario={version} mode="play" />
}
