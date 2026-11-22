import type { MapSnapshot, SnapshotPoint } from '@/features/articles/lib/mapSnapshot'

/**
 * The map on /join: "The Best Rooftop Bars in Lima" as a non-member already
 * sees it. The picture is the guide's saved OpenStreetMap render (its
 * `mapTeaser`, taken in the AI Blog Writer on 2026-11-16), and the dots are
 * the rough positions the API sends non-members (`gate.mapPins`, rounded by
 * the server's freeSample.ts), read from the live guide on 2026-11-22.
 *
 * Never a Google map, and never a picture of one: Google's terms forbid
 * storing it. Never mark this with `data-map-surface`: the reader journey
 * recorder reads that as a guide's map.
 */
export const ROOFTOP_MAP: MapSnapshot = {
  src: 'https://questurian-cdn.b-cdn.net/media/map-guide-17-mwiv176i.webp',
  srcSmall: 'https://questurian-cdn.b-cdn.net/media/map-guide-17-mwiv176i-782.webp',
  width: 782,
  height: 690,
  center: [-77.037795, -12.13329],
  zoom: 11.1455,
}

const ROUGH_PINS: Array<[lat: number, lng: number]> = [
  [-12.1255, -77.03506],
  [-12.1328, -77.02676],
  [-12.1245, -77.03406],
  [-12.0478, -77.03535],
  [-12.09709, -77.05705],
  [-12.12479, -77.02235],
  [-12.13209, -77.02965],
  [-12.12139, -77.02735],
  [-12.11909, -77.04065],
  [-12.09639, -77.03235],
  [-12.12769, -77.02765],
  [-12.09539, -77.03495],
  [-12.12069, -77.03265],
  [-12.11839, -77.02794],
  [-12.05968, -77.04124],
  [-12.12098, -77.02694],
  [-12.13668, -77.01624],
  [-12.14998, -77.02354],
]

export const ROOFTOP_POINTS: SnapshotPoint[] = ROUGH_PINS.map(([lat, lng], i) => ({
  id: `rooftop-${i + 1}`,
  lat,
  lng,
  inert: true,
  number: null,
}))
