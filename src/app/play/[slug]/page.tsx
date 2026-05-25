import type { Metadata } from 'next'
import Link from 'next/link'
import { getSupabaseServer } from '@/lib/supabase/server'
import { ScenarioPlayer } from '@/components/player/ScenarioPlayer'
import type { ScenarioNode, ScenarioEdge, ScenarioVersion } from '@/types'

interface PlayPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ embed?: string }>
}

type VersionRow = {
  id: string
  scenario_id: string
  version: number
  title: string
  nodes: ScenarioNode[]
  edges: ScenarioEdge[]
  start_node_id: string
  published_at: string
  slug: string
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
}

export async function generateMetadata({ params }: PlayPageProps): Promise<Metadata> {
  const { slug } = await params
  const sb = getSupabaseServer()
  const { data } = await sb.from('scenario_versions').select('title').eq('slug', slug).single()
  const row = data as { title?: string } | null
  const title = row?.title ? `${row.title} · BranchLab` : 'Play · BranchLab'
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
  const sb = getSupabaseServer()

  const { data } = await sb
    .from('scenario_versions')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!data) {
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

  const row = data as unknown as VersionRow
  const version: ScenarioVersion = {
    id: row.id,
    scenarioId: row.scenario_id,
    version: row.version,
    title: row.title,
    nodes: row.nodes ?? [],
    edges: row.edges ?? [],
    startNodeId: row.start_node_id,
    publishedAt: row.published_at,
    slug: row.slug,
  }

  return <ScenarioPlayer scenario={version} mode="play" embed={embed === '1'} />
}
