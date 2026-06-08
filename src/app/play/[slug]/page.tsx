import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { isSupabaseMode } from '@/lib/persistence/mode'
import { getPublishedBySlug } from '@/lib/persistence/scenarios'
import { resolvePlayAccess, accessCookieName, versionRowToScenarioVersion } from '@/lib/sharing'
import { PlayClient } from '@/components/player/PlayClient'
import { ScenarioPlayer } from '@/components/player/ScenarioPlayer'
import { PlayGateScreen } from '@/components/player/PlayGateScreen'
import { PasswordGate } from '@/components/player/PasswordGate'
import { PrivateGate } from '@/components/player/PrivateGate'

interface PlayPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ embed?: string; token?: string }>
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
}

export async function generateMetadata({ params }: PlayPageProps): Promise<Metadata> {
  const { slug } = await params

  if (!isSupabaseMode()) {
    return { title: 'Play · BranchLab' }
  }

  // Metadata must never leak gated titles — only describe public/unlisted
  // scenarios by name; everything else gets a generic title.
  const version = await getPublishedBySlug(slug)
  const isOpen = version && (version.visibility ?? 'public') !== 'private' && (version.visibility ?? 'public') !== 'password'
  const title = isOpen && version?.title ? `${version.title} · BranchLab` : 'Play · BranchLab'
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
  const { embed, token } = await searchParams
  const isEmbed = embed === '1'

  // Local mode: delegate to client component (localStorage is client-side only)
  if (!isSupabaseMode()) {
    return <PlayClient slug={slug} embed={isEmbed} />
  }

  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(accessCookieName(slug))?.value

  const access = await resolvePlayAccess({ slug, cookieValue, token: token ?? null })

  switch (access.status) {
    case 'not-found':
      return <PlayGateScreen kind="not-found" />
    case 'disabled':
      return <PlayGateScreen kind="disabled" />
    case 'denied':
      return <PlayGateScreen kind="denied" />
    case 'private':
      return <PrivateGate slug={slug} embed={isEmbed} />
    case 'password-required':
      return <PasswordGate slug={slug} />
    case 'allowed': {
      const version = versionRowToScenarioVersion(access.versionRow)
      return <ScenarioPlayer scenario={version} mode="play" embed={isEmbed} />
    }
  }
}
