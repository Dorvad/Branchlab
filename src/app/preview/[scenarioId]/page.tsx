import { PreviewShell } from '@/components/player/PreviewShell'
import { mockScenarios } from '@/data/mock-scenarios'

interface PreviewPageProps {
  params: Promise<{ scenarioId: string }>
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { scenarioId } = await params
  // Pass the mock scenario as fallback; PreviewShell loads the localStorage
  // version (which may have unsaved edits) and prefers that.
  const initialScenario = mockScenarios.find(s => s.id === scenarioId) ?? null
  return <PreviewShell scenarioId={scenarioId} initialScenario={initialScenario} />
}

export async function generateStaticParams() {
  return mockScenarios.map(s => ({ scenarioId: s.id }))
}
