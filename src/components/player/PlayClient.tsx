'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BranchLabLoader } from '@/components/BranchLabLoader'
import { ScenarioPlayer } from './ScenarioPlayer'
import { getPublishedBySlug } from '@/lib/persistence/scenarios'
import type { ScenarioVersion } from '@/types'

interface PlayClientProps {
  slug: string
  embed?: boolean
}

export function PlayClient({ slug, embed = false }: PlayClientProps) {
  const [version, setVersion] = useState<ScenarioVersion | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublishedBySlug(slug).then(v => {
      setVersion(v)
      setLoading(false)
    })
  }, [slug])

  if (loading) {
    return <BranchLabLoader size={260} />
  }

  if (!version) {
    return (
      <div
        className="flex h-screen items-center justify-center flex-col gap-4"
        style={{ background: '#0a0b10' }}
      >
        <p className="text-sm font-mono" style={{ color: '#5c6273' }}>
          No scenario published at{' '}
          <span style={{ color: '#c9cdda' }}>/play/{slug}</span>
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

  return <ScenarioPlayer scenario={version} mode="play" embed={embed} />
}
