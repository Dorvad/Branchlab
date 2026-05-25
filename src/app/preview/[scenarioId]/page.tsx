import { PreviewClient } from '@/components/player/PreviewClient'

interface PreviewPageProps {
  params: Promise<{ scenarioId: string }>
  searchParams: Promise<{ device?: string }>
}

export default async function PreviewPage({ params, searchParams }: PreviewPageProps) {
  const { scenarioId } = await params
  const { device } = await searchParams
  const initialDevice = device === 'desktop' ? 'desktop' : 'mobile'
  return <PreviewClient scenarioId={scenarioId} initialDevice={initialDevice} />
}
