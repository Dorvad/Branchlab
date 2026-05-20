import { EditorShell } from '@/components/editor/EditorShell'

interface EditorPageProps {
  params: Promise<{ scenarioId: string }>
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { scenarioId } = await params
  return <EditorShell scenarioId={scenarioId} />
}
