// GET /api/pexels/search?q=...&type=video|photo&page=1&orientation=...&size=...
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q           = searchParams.get('q') ?? ''
  const type        = searchParams.get('type') ?? 'video'
  const page        = searchParams.get('page') ?? '1'
  const perPage     = '20'
  const orientation = searchParams.get('orientation') ?? ''
  const size        = searchParams.get('size') ?? ''

  const base = type === 'video'
    ? 'https://api.pexels.com/videos/search'
    : 'https://api.pexels.com/v1/search'

  const params = new URLSearchParams({ query: q, per_page: perPage, page })
  if (orientation) params.set('orientation', orientation)
  if (size) params.set('size', size)

  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Pexels API key not configured' }, { status: 503 })
  }

  try {
    const res = await fetch(`${base}?${params}`, {
      headers: { Authorization: apiKey },
      next: { revalidate: 60 },
    })
    if (!res.ok) return Response.json({ error: 'Pexels error' }, { status: res.status })
    return Response.json(await res.json())
  } catch {
    return Response.json({ error: 'Failed to reach Pexels' }, { status: 502 })
  }
}
