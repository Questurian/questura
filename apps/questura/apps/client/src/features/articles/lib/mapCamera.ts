/**
 * Pure camera math for the listicle map. Lives outside MapPanel so the
 * framing rules can be tested without a Google Maps instance.
 */

export type LatLng = { lat: number; lng: number }

export type Camera = { center: LatLng; zoom: number }

export type CameraPoint = { lat: number; lng: number }

const WORLD_TILE_PX = 256
const TWO_PI = Math.PI * 2

export function mercatorY(lat: number): number {
  const sin = Math.sin((lat * Math.PI) / 180)
  return Math.log((1 + sin) / (1 - sin)) / 2
}

export function latFromMercatorY(y: number): number {
  return ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h))
}

/**
 * Shift a camera centre south by `pixels` at `zoom`, so a point that would
 * land on the map div's own centre instead lands higher up the div.
 *
 * The mobile sheet keeps a full-height map and slides it partly below the
 * fold, so the visible centre is above the div centre by half the hidden
 * height. Moving the camera south by that much puts the active stop back in
 * the middle of what the reader can actually see.
 */
export function shiftCenterSouthByPixels(
  center: LatLng,
  zoom: number,
  pixels: number,
): LatLng {
  if (pixels === 0) return center
  const worldPx = WORLD_TILE_PX * 2 ** zoom
  return {
    lat: latFromMercatorY(mercatorY(center.lat) - (pixels * TWO_PI) / worldPx),
    lng: center.lng,
  }
}

/**
 * The stops the overview frames: all of them, minus a few far strays.
 *
 * One club across town stretched a two-neighbourhood guide to the whole city,
 * and on the phone's short split strip that left every other dot in a clump
 * (owner, 2026-11-21: Le Paris in central Lima on the Miraflores & Barranco
 * nightclubs). A stop counts as a stray when it sits more than
 * `STRAY_FACTOR` times the typical distance from the middle of the guide.
 * At most a tenth of the stops are dropped, and never on a short list, so a
 * guide that is genuinely spread out keeps its whole frame. A stray still has
 * its dot; the camera reaches it when the reader does.
 */
const STRAY_FACTOR = 3
const STRAY_MIN_POINTS = 6
const STRAY_MAX_SHARE = 0.1

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function framedPoints<T extends CameraPoint>(points: T[]): T[] {
  if (points.length < STRAY_MIN_POINTS) return points
  const middle = {
    lat: median(points.map((point) => point.lat)),
    lng: median(points.map((point) => point.lng)),
  }
  const distances = points.map((point) => haversineMeters(middle, point))
  const typical = median(distances)
  if (typical === 0) return points
  const limit = typical * STRAY_FACTOR
  const strays = distances
    .map((distance, index) => ({ distance, index }))
    .filter(({ distance }) => distance > limit)
    .sort((a, b) => b.distance - a.distance)
    .slice(0, Math.floor(points.length * STRAY_MAX_SHARE))
  if (strays.length === 0) return points
  const dropped = new Set(strays.map(({ index }) => index))
  return points.filter((_, index) => !dropped.has(index))
}

export type FitOptions = {
  /** Map div size in CSS pixels. */
  width: number
  height: number
  /** Map div pixels hidden below the fold (mobile sheet); 0 on desktop. */
  insetBottom?: number
  padding: number
  maxZoom: number
  /** Backs off from the exact fit so pins keep air around them. */
  zoomOut: number
  fallback: Camera
  singlePointZoom: number
}

/**
 * The centre/zoom `fitBounds` would land on, computed up front so the move
 * can go through the manual fly animation - `fitBounds` itself snaps on jumps
 * larger than a viewport, which is what made day switches flash.
 */
export function cameraForPoints(
  points: CameraPoint[],
  options: FitOptions,
): Camera {
  const inset = options.insetBottom ?? 0

  if (points.length === 0) return options.fallback
  if (points.length === 1) {
    return {
      center: shiftCenterSouthByPixels(
        { lat: points[0].lat, lng: points[0].lng },
        options.singlePointZoom,
        inset / 2,
      ),
      zoom: options.singlePointZoom,
    }
  }

  const lats = points.map((point) => point.lat)
  const lngs = points.map((point) => point.lng)
  const north = Math.max(...lats)
  const south = Math.min(...lats)
  const east = Math.max(...lngs)
  const west = Math.min(...lngs)

  const latFraction = (mercatorY(north) - mercatorY(south)) / TWO_PI
  const lngFraction = (east - west) / 360

  const usableWidth = Math.max(options.width - options.padding * 2, 1)
  const usableHeight = Math.max(options.height - inset - options.padding * 2, 1)
  const latZoom = Math.log2(
    usableHeight / WORLD_TILE_PX / Math.max(latFraction, 1e-9),
  )
  const lngZoom = Math.log2(
    usableWidth / WORLD_TILE_PX / Math.max(lngFraction, 1e-9),
  )

  const zoom = Math.min(latZoom, lngZoom, options.maxZoom) - options.zoomOut
  const center = {
    lat: latFromMercatorY((mercatorY(north) + mercatorY(south)) / 2),
    lng: (east + west) / 2,
  }

  return { center: shiftCenterSouthByPixels(center, zoom, inset / 2), zoom }
}

export type ActiveZoomOptions = {
  /** The zoom a stop gets when nothing crowds it. */
  baseZoom: number
  /** Never closer than this, however tight the street. */
  maxZoom: number
  /** Centre-to-centre gap, in CSS pixels, the nearest neighbour must clear. */
  minSeparationPx: number
  /**
   * Neighbours closer than this share a building or a corner: no zoom a
   * reader would want separates them, so they do not count.
   */
  ignoreWithinMeters: number
}

/**
 * How close to sit on the active stop: the mode's usual zoom, or closer when
 * its nearest neighbour would otherwise sit on top of it.
 *
 * A fixed zoom reads well on a spread-out guide and as a clump on a street of
 * bars a few doors apart (owner, 2026-11-21, Calle Berlin). So the camera
 * steps in only as far as it takes for the closest other stop to clear
 * `minSeparationPx`, and stops at `maxZoom` so a stop still shows its block.
 */
export function activeZoomFor(
  active: CameraPoint,
  points: CameraPoint[],
  options: ActiveZoomOptions,
): number {
  const activeY = mercatorY(active.lat)
  let nearest = Infinity
  for (const point of points) {
    if (point === active) continue
    if (haversineMeters(active, point) < options.ignoreWithinMeters) continue
    // World units at zoom 0, where the whole world is one 256px tile.
    const dx = ((point.lng - active.lng) / 360) * WORLD_TILE_PX
    const dy = ((mercatorY(point.lat) - activeY) / TWO_PI) * WORLD_TILE_PX
    nearest = Math.min(nearest, Math.hypot(dx, dy))
  }
  if (!Number.isFinite(nearest) || nearest === 0) return options.baseZoom
  const needed = Math.log2(options.minSeparationPx / nearest)
  return Math.min(Math.max(options.baseZoom, needed), Math.max(options.maxZoom, options.baseZoom))
}
