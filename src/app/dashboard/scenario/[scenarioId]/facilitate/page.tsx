import { FacilitatorSessionsPage } from '@/components/facilitator/FacilitatorSessionsPage'

interface Props {
  params: Promise<{ scenarioId: string }>
}

export default async function FacilitatorSessionsRoute({ params }: Props) {
  const { scenarioId } = await params
  return <FacilitatorSessionsPage scenarioId={scenarioId} />
}
