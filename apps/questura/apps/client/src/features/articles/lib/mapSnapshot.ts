/**
 * Placing a guide's saved map picture, and the markers over it (MapTeaser.tsx).
 *
 * The pictures are OpenStreetMap renders made by
 * `apps/e2e/scripts/render-map-teasers.mjs`, one per locked guide, listed in
 * `data/mapTeasers.json` with the frame each was drawn at. They are pictures,
 * not maps, so the markers are placed here with the same Web Mercator maths
 * the renderer used (MapLibre's 512 px world).
 */

export type MapSnapshot = {
  /** The 2x render, and the 1x one for small screens. */
  src: string
  srcSmall: string
  /** The frame the picture was drawn at, in CSS px. */
  width: number
  height: number
  center: [lng: number, lat: number]
  zoom: number
}

export type SnapshotPoint = { id: string; lat: number; lng: number; inert: boolean; number: number | null }

export type SnapshotLayout = {
  /** Where the picture sits in the box: cover, centred across, pinned to the top. */
  image: { left: number; top: number; width: number; height: number }
  pins: Array<{ id: string; x: number; y: number; free: boolean; number: number | null }>
}

const WORLD_AT_ZOOM_0 = 512
/** A place this far outside the picture still counts as on it: its marker is half on the paper. */
const EDGE_TOLERANCE_PX = 8

function worldPx(lat: number, lng: number, zoom: number) {
  const size = WORLD_AT_ZOOM_0 * 2 ** zoom
  const sin = Math.sin((lat * Math.PI) / 180)
  return {
    x: ((lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  }
}

/**
 * Null when the picture cannot carry the guide: a place outside its frame
 * (the guide changed since it was drawn) or no room to draw in. The teaser
 * then falls back to its drawing.
 */
export function layoutSnapshot(
  snapshot: MapSnapshot,
  points: SnapshotPoint[],
  box: { width: number; height: number },
  /**
   * The strip of the box the markers should sit in, clear of the join card,
   * in box px. The picture slides up or down (never off the box's edges) to
   * put the places' middle there. Without it the picture is pinned to the top.
   */
  focus?: { top: number; bottom: number },
): SnapshotLayout | null {
  if (box.width <= 0 || box.height <= 0 || points.length === 0) return null

  const center = worldPx(snapshot.center[1], snapshot.center[0], snapshot.zoom)
  const inFrame = points.map((point) => {
    const at = worldPx(point.lat, point.lng, snapshot.zoom)
    return { point, fx: at.x - center.x + snapshot.width / 2, fy: at.y - center.y + snapshot.height / 2 }
  })
  const outside = inFrame.some(
    ({ fx, fy }) =>
      fx < -EDGE_TOLERANCE_PX ||
      fy < -EDGE_TOLERANCE_PX ||
      fx > snapshot.width + EDGE_TOLERANCE_PX ||
      fy > snapshot.height + EDGE_TOLERANCE_PX,
  )
  if (outside) return null

  // Cover the box. The places sit in the picture's upper part, so a short box
  // (the phone's split view) keeps the top and loses the bottom, where the
  // join card goes anyway; a narrow one loses the sides equally.
  const scale = Math.max(box.width / snapshot.width, box.height / snapshot.height)
  const width = snapshot.width * scale
  const height = snapshot.height * scale
  const left = (box.width - width) / 2
  let top = 0
  if (focus) {
    const ys = inFrame.map(({ fy }) => fy * scale)
    const placesMiddle = (Math.min(...ys) + Math.max(...ys)) / 2
    const wanted = (focus.top + focus.bottom) / 2 - placesMiddle
    top = Math.min(0, Math.max(box.height - height, wanted))
  }

  return {
    image: { left, top, width, height },
    pins: inFrame.map(({ point, fx, fy }) => ({
      id: point.id,
      x: left + fx * scale,
      y: top + fy * scale,
      free: !point.inert,
      number: point.inert ? null : point.number,
    })),
  }
}
