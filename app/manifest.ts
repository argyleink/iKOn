import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'iKOn — icon discovery by association',
    short_name: 'iKOn',
    description:
      'Search and browse icons by similarity. Results radiate from the center like a shockwave.',
    start_url: '/',
    id: '/',
    display: 'fullscreen',
    display_override: ['fullscreen', 'standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: '#000000',
    theme_color: '#000000',
    categories: ['design', 'productivity', 'utilities'],
    icons: [
      { src: '/iKOn.png', sizes: '1000x1000', type: 'image/png', purpose: 'any' },
      { src: '/iKOn.png', sizes: '1000x1000', type: 'image/png', purpose: 'maskable' },
      { src: '/iKOn.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/iKOn.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    ],
  }
}
