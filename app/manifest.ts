import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ARGUS — Always Monitoring the Situation',
    short_name: 'ARGUS',
    description: 'Real-time global intelligence dashboard',
    start_url: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#00ff88',
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
