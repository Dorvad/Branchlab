import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ScenarioPlayer } from '@/components/player/ScenarioPlayer'
import { mockPublishedScenarios } from '@/data/mock-scenarios'

interface PlayPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PlayPageProps): Promise<Metadata> {
  const { slug } = await params
  const version = mockPublishedScenarios[slug]
  if (!version) return { title: 'Not Found' }
  return {
    title: `Play · BranchLab`,
    description: 'An interactive branching video scenario.',
  }
}

export default async function PlayPage({ params }: PlayPageProps) {
  const { slug } = await params
  const version = mockPublishedScenarios[slug]
  if (!version) notFound()

  return <ScenarioPlayer scenario={version} mode="play" />
}

export async function generateStaticParams() {
  return Object.keys(mockPublishedScenarios).map(slug => ({ slug }))
}
