import { EditorShell } from '@/components/editor/EditorShell'
import { mockScenarios } from '@/data/mock-scenarios'

interface EditorPageProps {
  params: Promise<{ scenarioId: string }>
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { scenarioId } = await params
  // Pass the mock scenario if it exists; EditorShell will prefer the
  // localStorage version if one has been saved for this ID.
  const initialScenario = mockScenarios.find(s => s.id === scenarioId) ?? null
  return <EditorShell scenarioId={scenarioId} initialScenario={initialScenario} />
}

export async function generateStaticParams() {
  return mockScenarios.map(s => ({ scenarioId: s.id }))
}
