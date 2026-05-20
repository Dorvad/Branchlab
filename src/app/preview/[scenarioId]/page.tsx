import { PreviewClient } from '@/components/player/PreviewClient'

interface PreviewPageProps {
  params: Promise<{ scenarioId: string }>
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { scenarioId } = await params
  return <PreviewClient scenarioId={scenarioId} />
}
