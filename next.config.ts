import type { NextConfig } from 'next'

// Long-lived cache for the two large static assets: the icon DB (~9 MB JSON
// regenerated on every `next build`) and the PWA launcher icon. The edge
// cache is purged automatically on new Vercel deployments, so s-maxage can
// be aggressive; browser max-age is short enough that updates roll out
// promptly if a cached deploy URL is revisited.
const LONG_LIVED = 'public, max-age=3600, s-maxage=31536000, stale-while-revalidate=86400'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/icons.json',
        headers: [{ key: 'Cache-Control', value: LONG_LIVED }],
      },
    ]
  },
}

export default nextConfig
