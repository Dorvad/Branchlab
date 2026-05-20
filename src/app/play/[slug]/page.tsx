import type { Metadata } from 'next'
import { PlayPageClient } from '@/components/player/PlayPageClient'
import { mockPublishedScenarios } from '@/data/mock-scenarios'

interface PlayPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PlayPageProps): Promise<Metadata> {
  const { slug } = await params
  const version = mockPublishedScenarios[slug]
  return {
    title: version?.title ? `${version.title} · BranchLab` : 'Play · BranchLab',
    description: 'An interactive branching video scenario.',
  }
}

export default async function PlayPage({ params }: PlayPageProps) {
  const { slug } = await params
  // Pass the mock version as a server-side fallback for known slugs.
  // PlayPageClient will prefer the localStorage version if one exists
  // (e.g. after the creator republishes with updated content).
  const fallback = mockPublishedScenarios[slug] ?? null
  return <PlayPageClient slug={slug} fallback={fallback} />
}

export async function generateStaticParams() {
  return Object.keys(mockPublishedScenarios).map(slug => ({ slug }))
}
