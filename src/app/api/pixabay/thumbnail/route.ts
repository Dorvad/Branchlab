export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) return new Response('Missing url', { status: 400 })

  if (
    !url.startsWith('https://i.vimeocdn.com/') &&
    !url.startsWith('https://cdn.pixabay.com/')
  ) {
    return new Response('Forbidden', { status: 403 })
  }

  const res = await fetch(url, {
    headers: { Referer: 'https://pixabay.com/' },
  })

  if (!res.ok) return new Response('Image not found', { status: res.status })

  const contentType = res.headers.get('content-type') || 'image/jpeg'
  return new Response(res.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
