import { notFound } from 'next/navigation'
import { EditorShell } from '@/components/editor/EditorShell'
import { mockScenarios } from '@/data/mock-scenarios'

interface EditorPageProps {
  params: Promise<{ scenarioId: string }>
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { scenarioId } = await params
  const scenario = mockScenarios.find(s => s.id === scenarioId)
  if (!scenario) notFound()

  return <EditorShell scenario={scenario} />
}

export async function generateStaticParams() {
  return mockScenarios.map(s => ({ scenarioId: s.id }))
}
