import type { CoverrResponse } from './types'

export interface CoverrSearchParams {
  q: string
  page?: number
  perPage?: number
}

export async function searchCoverr(p: CoverrSearchParams): Promise<CoverrResponse> {
  const params = new URLSearchParams({
    q: p.q,
    page: String(p.page ?? 0),
    per_page: String(p.perPage ?? 20),
  })
  const res = await fetch(`/api/coverr/videos?${params}`)
  if (!res.ok) throw new Error('Coverr search failed')
  return res.json()
}
