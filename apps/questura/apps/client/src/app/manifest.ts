import type { MetadataRoute } from 'next'

/**
 * /manifest.webmanifest, for "Add to Home Screen" and crawlers that look for
 * one. The icons are the same brand mark as icon.svg (apple-icon.png is that
 * SVG rasterised at 180px without the rounded corners iOS adds itself).
 * Colours are foundations.css tokens: --background and --accent.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Questurian',
    short_name: 'Questurian',
    description: 'Curated city guides, travel maps, itineraries, and local recommendations.',
    start_url: '/',
    display: 'browser',
    background_color: '#F5F0E8',
    theme_color: '#3B5BDB',
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { src: '/apple-icon.png', type: 'image/png', sizes: '180x180' },
    ],
  }
}
