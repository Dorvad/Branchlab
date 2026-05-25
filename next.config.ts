import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // FFmpeg.wasm uses browser APIs — exclude from server-side bundle
  serverExternalPackages: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
}

export default nextConfig
