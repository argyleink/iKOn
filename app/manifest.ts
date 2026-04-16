import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'iKOn — icon discovery by association',
    short_name: 'iKOn',
    description:
      'Search and browse icons by similarity. Design and name inspired by the Teenage Engineering KO-II EP-133 screen aesthetic.',
    start_url: '/',
    id: '/',
    display: 'fullscreen',
    display_override: ['fullscreen', 'standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: '#000000',
    theme_color: '#000000',
    categories: ['design', 'productivity', 'utilities'],
    icons: [
      {
        src: '/icon.png',
        sizes: '1000x1000',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '1000x1000',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
