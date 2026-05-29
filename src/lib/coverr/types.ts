export interface CoverrVideoUrls {
  mp4: string
  mp4_preview: string
  mp4_download: string
}

export interface CoverrVideoHit {
  id: string
  title: string
  thumbnail: string
  poster: string
  duration: number
  is_vertical: boolean
  aspect_ratio: number
  max_width: number
  max_height: number
  tags: string[]
  urls: CoverrVideoUrls
}

export interface CoverrResponse {
  page: number
  pages: number
  page_size: number
  total: number
  hits: CoverrVideoHit[]
}
