import { ParticipantRoom } from '@/components/facilitator/ParticipantRoom'

interface Props {
  params: Promise<{ joinCode: string }>
}

export default async function JoinPage({ params }: Props) {
  const { joinCode } = await params
  return <ParticipantRoom joinCode={joinCode} />
}
