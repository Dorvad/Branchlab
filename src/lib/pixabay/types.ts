export interface PixabayImage {
  id: number
  pageURL: string
  type: string              // 'photo' | 'illustration' | 'vector'
  tags: string
  previewURL: string        // ~150px thumbnail
  webformatURL: string      // ~640px
  largeImageURL: string     // full resolution
  imageWidth: number
  imageHeight: number
  imageSize: number
  user: string
  userImageURL: string
}

export interface PixabayVideoFile {
  url: string
  width: number
  height: number
  size: number
}

export interface PixabayVideoFiles {
  large: PixabayVideoFile
  medium: PixabayVideoFile
  small: PixabayVideoFile
  tiny: PixabayVideoFile
}

export interface PixabayVideo {
  id: number
  pageURL: string
  type: string
  tags: string
  duration: number          // seconds
  picture_id: string        // for vimeo thumbnail
  videos: PixabayVideoFiles
  user: string
  userImageURL: string
}

export interface PixabayResponse {
  total: number
  totalHits: number
  hits: (PixabayImage | PixabayVideo)[]
}

export type PixabayMediaType = 'video' | 'image'
export type PixabayOrientation = 'all' | 'horizontal' | 'vertical'
export type PixabayImageType = 'all' | 'photo' | 'illustration' | 'vector'
