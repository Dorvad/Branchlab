// GET /api/pixabay/search?q=...&type=video|image&page=1&per_page=20&orientation=all|horizontal|vertical&image_type=all|photo|illustration|vector
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q           = searchParams.get('q') ?? ''
  const type        = searchParams.get('type') ?? 'video'      // 'video' | 'image'
  const page        = searchParams.get('page') ?? '1'
  const perPage     = searchParams.get('per_page') ?? '20'
  const orientation = searchParams.get('orientation') ?? 'all'  // 'all' | 'horizontal' | 'vertical'
  const imageType   = searchParams.get('image_type') ?? 'all'  // images only

  const apiKey = process.env.PIXABAY_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Pixabay API key not configured' }, { status: 503 })
  }

  const base = type === 'video'
    ? 'https://pixabay.com/api/videos/'
    : 'https://pixabay.com/api/'

  const params = new URLSearchParams({ key: apiKey, q, page, per_page: perPage, safesearch: 'true' })
  if (orientation !== 'all') params.set('orientation', orientation)
  if (type === 'image' && imageType !== 'all') params.set('image_type', imageType)

  try {
    const res = await fetch(`${base}?${params}`, { next: { revalidate: 60 } })
    if (!res.ok) return Response.json({ error: 'Pixabay error' }, { status: res.status })
    return Response.json(await res.json())
  } catch {
    return Response.json({ error: 'Failed to reach Pixabay' }, { status: 502 })
  }
}
