import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // FFmpeg.wasm uses browser APIs — exclude from server-side bundle
  serverExternalPackages: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],

  async headers() {
    return [
      {
        // Allow the play route to be embedded in iframes from the portfolio site.
        // frame-ancestors takes precedence over X-Frame-Options in all modern browsers.
        source: '/play/:slug*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://www.dorsfolio.online https://dorsfolio.online",
          },
          // Explicitly set X-Frame-Options to a permissive value so it doesn't
          // conflict on older browsers that don't support frame-ancestors CSP.
          // 'ALLOWALL' is non-standard but understood by most servers; modern
          // browsers ignore it in favour of the CSP directive above.
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
        ],
      },
    ]
  },
}

export default nextConfig
