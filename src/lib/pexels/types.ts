export interface PexelsPhotoSrc {
  original: string
  large2x: string
  large: string
  medium: string
  small: string
  portrait: string
  landscape: string
  tiny: string
}

export interface PexelsPhoto {
  id: number
  width: number
  height: number
  url: string
  photographer: string
  photographer_url: string
  src: PexelsPhotoSrc
  alt: string
}

export interface PexelsVideoFile {
  id: number
  quality: string
  file_type: string
  width: number
  height: number
  fps: number
  link: string
}

export interface PexelsVideo {
  id: number
  width: number
  height: number
  duration: number
  url: string
  image: string
  user: { name: string; url: string }
  video_files: PexelsVideoFile[]
}

export interface PexelsPhotoResponse {
  total_results: number
  page: number
  per_page: number
  photos: PexelsPhoto[]
  next_page?: string
}

export interface PexelsVideoResponse {
  total_results: number
  page: number
  per_page: number
  videos: PexelsVideo[]
  next_page?: string
}

export type PexelsMediaType = 'video' | 'photo'
export type PexelsOrientation = '' | 'landscape' | 'portrait' | 'square'
export type PexelsSize = '' | 'large' | 'medium' | 'small'
