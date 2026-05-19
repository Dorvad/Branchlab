import { notFound } from 'next/navigation'
import { ScenarioPlayer } from '@/components/player/ScenarioPlayer'
import { mockScenarios } from '@/data/mock-scenarios'

interface PreviewPageProps {
  params: Promise<{ scenarioId: string }>
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { scenarioId } = await params
  const scenario = mockScenarios.find(s => s.id === scenarioId)
  if (!scenario) notFound()

  return (
    <ScenarioPlayer
      scenario={scenario}
      mode="preview"
      backHref={`/editor/${scenario.id}`}
    />
  )
}

export async function generateStaticParams() {
  return mockScenarios.map(s => ({ scenarioId: s.id }))
}
