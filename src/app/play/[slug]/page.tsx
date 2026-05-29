import type { Metadata } from 'next'
import Link from 'next/link'
import { isSupabaseMode } from '@/lib/persistence/mode'
import { getPublishedBySlug } from '@/lib/persistence/scenarios'
import { PlayClient } from '@/components/player/PlayClient'
import { ScenarioPlayer } from '@/components/player/ScenarioPlayer'

interface PlayPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ embed?: string }>
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
}

export async function generateMetadata({ params }: PlayPageProps): Promise<Metadata> {
  const { slug } = await params

  if (!isSupabaseMode()) {
    return { title: 'Play · BranchLab' }
  }

  const version = await getPublishedBySlug(slug)
  const title = version?.title ? `${version.title} · BranchLab` : 'Play · BranchLab'
  const base = appUrl()
  const canonicalUrl = base ? `${base}/play/${slug}` : undefined
  return {
    title,
    description: 'An interactive branching video scenario.',
    ...(canonicalUrl && {
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title,
        description: 'An interactive branching video scenario.',
        url: canonicalUrl,
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title,
        description: 'An interactive branching video scenario.',
      },
    }),
  }
}

export default async function PlayPage({ params, searchParams }: PlayPageProps) {
  const { slug } = await params
  const { embed } = await searchParams

  // Local mode: delegate to client component (localStorage is client-side only)
  if (!isSupabaseMode()) {
    return <PlayClient slug={slug} embed={embed === '1'} />
  }

  // Supabase mode: load server-side so the page is fully rendered before sending HTML
  const version = await getPublishedBySlug(slug)

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

  return <ScenarioPlayer scenario={version} mode="play" embed={embed === '1'} />
}
