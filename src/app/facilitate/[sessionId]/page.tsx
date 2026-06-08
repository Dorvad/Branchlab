import { HostControlRoom } from '@/components/facilitator/HostControlRoom'

interface Props {
  params: Promise<{ sessionId: string }>
}

export default async function FacilitateRoomPage({ params }: Props) {
  const { sessionId } = await params
  return <HostControlRoom sessionId={sessionId} />
}
