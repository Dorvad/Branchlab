import type {
  PixabayMediaType,
  PixabayOrientation,
  PixabayImageType,
  PixabayImage,
  PixabayVideo,
  PixabayVideoFile,
  PixabayResponse,
} from './types'

export interface PixabaySearchParams {
  q: string
  type: PixabayMediaType
  page?: number
  perPage?: number
  orientation?: PixabayOrientation
  imageType?: PixabayImageType
}

export async function searchPixabay(p: PixabaySearchParams): Promise<PixabayResponse> {
  const params = new URLSearchParams({
    q: p.q,
    type: p.type,
    page: String(p.page ?? 1),
    per_page: String(p.perPage ?? 20),
    orientation: p.orientation ?? 'all',
    ...(p.imageType ? { image_type: p.imageType } : {}),
  })
  const res = await fetch(`/api/pixabay/search?${params}`)
  if (!res.ok) throw new Error('Pixabay search failed')
  return res.json()
}

/** Thumbnail URL for a Pixabay video, proxied server-side to bypass Vimeo CDN hotlink protection. */
export function videoThumbnail(video: PixabayVideo): string {
  const vimeoUrl = `https://i.vimeocdn.com/video/${video.picture_id}_295x166.jpg`
  return `/api/pixabay/thumbnail?url=${encodeURIComponent(vimeoUrl)}`
}

/** Pick best available video file: large → medium → small → tiny. */
export function bestVideoFile(video: PixabayVideo): PixabayVideoFile {
  return video.videos.large?.url
    ? video.videos.large
    : video.videos.medium?.url
    ? video.videos.medium
    : video.videos.small?.url
    ? video.videos.small
    : video.videos.tiny
}

export function isPixabayVideo(hit: PixabayImage | PixabayVideo): hit is PixabayVideo {
  return 'videos' in hit
}

export function asImages(hits: (PixabayImage | PixabayVideo)[]): PixabayImage[] {
  return hits.filter((h): h is PixabayImage => !isPixabayVideo(h))
}

export function asVideos(hits: (PixabayImage | PixabayVideo)[]): PixabayVideo[] {
  return hits.filter((h): h is PixabayVideo => isPixabayVideo(h))
}
