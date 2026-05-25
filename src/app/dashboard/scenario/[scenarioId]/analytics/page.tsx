import { ScenarioAnalyticsPage } from '@/components/analytics/ScenarioAnalyticsPage'

interface Props {
  params: Promise<{ scenarioId: string }>
}

export default async function AnalyticsPage({ params }: Props) {
  const { scenarioId } = await params
  return <ScenarioAnalyticsPage scenarioId={scenarioId} />
}
