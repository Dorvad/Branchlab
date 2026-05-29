// GET /api/coverr/videos?q=...&page=0&per_page=20
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q       = searchParams.get('q') ?? ''
  const page    = searchParams.get('page') ?? '0'
  const perPage = searchParams.get('per_page') ?? '20'

  const apiKey = process.env.COVERR_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Coverr API key not configured' }, { status: 503 })
  }

  const params = new URLSearchParams({
    query: q,
    page,
    page_size: perPage,
    urls: 'true',
  })

  try {
    const res = await fetch(`https://api.coverr.co/videos?${params}`, {
      headers: { Authorization: apiKey },
      next: { revalidate: 60 },
    })
    if (!res.ok) return Response.json({ error: 'Coverr error' }, { status: res.status })
    return Response.json(await res.json())
  } catch {
    return Response.json({ error: 'Failed to reach Coverr' }, { status: 502 })
  }
}
