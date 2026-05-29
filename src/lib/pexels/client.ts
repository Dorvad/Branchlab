import type {
  PexelsMediaType,
  PexelsOrientation,
  PexelsSize,
  PexelsPhoto,
  PexelsPhotoResponse,
  PexelsVideo,
  PexelsVideoFile,
  PexelsVideoResponse,
} from './types'

export interface PexelsSearchParams {
  q: string
  type: PexelsMediaType
  page?: number
  orientation?: PexelsOrientation
  size?: PexelsSize
}

export async function searchPexels(
  p: PexelsSearchParams,
): Promise<PexelsPhotoResponse | PexelsVideoResponse> {
  const params = new URLSearchParams({
    q: p.q,
    type: p.type,
    page: String(p.page ?? 1),
    ...(p.orientation && { orientation: p.orientation }),
    ...(p.size && { size: p.size }),
  })
  const res = await fetch(`/api/pexels/search?${params}`)
  if (!res.ok) throw new Error('Pexels search failed')
  return res.json()
}

export function bestVideoFile(video: PexelsVideo): PexelsVideoFile {
  return (
    video.video_files.find(f => f.quality === 'hd') ??
    video.video_files.find(f => f.quality === 'sd') ??
    video.video_files[0]
  )
}

export function isPhotoResponse(r: PexelsPhotoResponse | PexelsVideoResponse): r is PexelsPhotoResponse {
  return 'photos' in r
}

export function asPhotos(r: PexelsPhotoResponse | PexelsVideoResponse): PexelsPhoto[] {
  return isPhotoResponse(r) ? r.photos : []
}

export function asVideos(r: PexelsPhotoResponse | PexelsVideoResponse): PexelsVideo[] {
  return !isPhotoResponse(r) ? r.videos : []
}
