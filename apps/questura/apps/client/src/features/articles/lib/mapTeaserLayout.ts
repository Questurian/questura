/**
 * Where the map teaser draws its pins and neighborhood names (MapTeaser.tsx).
 *
 * The teaser is a drawing, not a map: no tiles, no streets. Pins keep their
 * places relative to each other -- north stays up and the list keeps its
 * shape -- and the locked ones arrive already rough from the server
 * (freeSample.ts), so nothing here can be read back to a street.
 */

export type TeaserPoint = {
  id: string
  lat: number
  lng: number
  /** True for a place the reader cannot open: drawn grey, not clickable. */
  inert: boolean
  /** The entry's number in the list, for a pin the reader can open. */
  number: number | null
  area: string | null
}

export type TeaserPin = {
  id: string
  /** Percent of the drawing's width and height. */
  x: number
  y: number
  free: boolean
  number: number | null
}

export type TeaserLabel = {
  text: string
  x: number
  y: number
  /** Which side of its cluster the name sits on, so it never covers a pin. */
  side: 'left' | 'right'
  /** Neighborhoods holding more than three places read a size up. */
  big: boolean
}

type Box = { width: number; height: number; compact: boolean }

/** The band the pins occupy, as fractions of the drawing's height. The call to join sits below it. */
const BANDS = {
  regular: { top: 0.09, bottom: 0.56 },
  compact: { top: 0.16, bottom: 0.42 },
}
const SIDE_MARGIN = 0.08
const LABEL_GAP_PX = 14
const LABEL_LINE_PX = 20

export function layoutMapTeaser(points: TeaserPoint[], box: Box): { pins: TeaserPin[]; labels: TeaserLabel[] } {
  if (points.length === 0 || box.width <= 0 || box.height <= 0) return { pins: [], labels: [] }

  const band = box.compact ? BANDS.compact : BANDS.regular
  const midLat = (Math.max(...points.map((p) => p.lat)) + Math.min(...points.map((p) => p.lat))) / 2
  // A degree of longitude is shorter than a degree of latitude away from the
  // equator; without this a city stretches sideways.
  const squeeze = Math.cos((midLat * Math.PI) / 180)
  const xs = points.map((p) => p.lng * squeeze)
  const ys = points.map((p) => -p.lat)
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)]
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)]

  const usableWidth = box.width * (1 - 2 * SIDE_MARGIN)
  const usableHeight = box.height * (band.bottom - band.top)
  const scale = Math.min(
    x1 > x0 ? usableWidth / (x1 - x0) : Infinity,
    y1 > y0 ? usableHeight / (y1 - y0) : Infinity,
  )
  const unit = Number.isFinite(scale) ? scale : 0
  const centerX = box.width / 2
  const centerY = box.height * ((band.top + band.bottom) / 2)

  const placed = points.map((point, i) => ({
    point,
    px: centerX + (xs[i]! - (x0 + x1) / 2) * unit,
    py: centerY + (ys[i]! - (y0 + y1) / 2) * unit,
  }))

  const pins: TeaserPin[] = placed.map(({ point, px, py }) => ({
    id: point.id,
    x: (px / box.width) * 100,
    y: (py / box.height) * 100,
    free: !point.inert,
    number: point.inert ? null : point.number,
  }))

  if (box.compact) return { pins, labels: [] }

  const byArea = new Map<string, typeof placed>()
  for (const entry of placed) {
    if (!entry.point.area) continue
    byArea.set(entry.point.area, [...(byArea.get(entry.point.area) ?? []), entry])
  }

  // Each name hangs off a real pin -- the one nearest its neighborhood's
  // middle -- so a spread-out neighborhood is not named in empty paper.
  const labels = [...byArea.entries()].map(([text, members]) => {
    const meanX = members.reduce((sum, m) => sum + m.px, 0) / members.length
    const meanY = members.reduce((sum, m) => sum + m.py, 0) / members.length
    const anchor = members.reduce((best, m) =>
      Math.hypot(m.px - meanX, m.py - meanY) < Math.hypot(best.px - meanX, best.py - meanY) ? m : best,
    )
    const side: 'left' | 'right' = meanX >= centerX ? 'right' : 'left'
    const px = side === 'right' ? anchor.px + LABEL_GAP_PX : anchor.px - LABEL_GAP_PX
    return { text, px, py: anchor.py, side, big: members.length > 3 }
  })

  // Two names on the same side closer than a line apart push apart, downward.
  for (const side of ['left', 'right'] as const) {
    const column = labels.filter((label) => label.side === side).sort((a, b) => a.py - b.py)
    for (let i = 1; i < column.length; i++) {
      const previous = column[i - 1]!
      if (column[i]!.py - previous.py < LABEL_LINE_PX) column[i]!.py = previous.py + LABEL_LINE_PX
    }
  }

  // A neighbor's pin on the name's line pushes the name past it too.
  for (const label of labels) {
    const onLine = placed.filter((entry) => Math.abs(entry.py - label.py) < LABEL_LINE_PX / 2)
    if (onLine.length === 0) continue
    label.px =
      label.side === 'right'
        ? Math.max(label.px, Math.max(...onLine.map((entry) => entry.px)) + LABEL_GAP_PX)
        : Math.min(label.px, Math.min(...onLine.map((entry) => entry.px)) - LABEL_GAP_PX)
  }

  return {
    pins,
    labels: labels.map(({ text, px, py, side, big }) => ({
      text,
      x: (px / box.width) * 100,
      y: (py / box.height) * 100,
      side,
      big,
    })),
  }
}

/**
 * "13 places across Miraflores, Lince and 5 more neighborhoods." The phone's
 * stand-in for the names the drawing has no room for. Null when no place has a
 * neighborhood.
 */
export function teaserAreaLine(points: TeaserPoint[]): string | null {
  const counts = new Map<string, number>()
  for (const point of points) if (point.area) counts.set(point.area, (counts.get(point.area) ?? 0) + 1)
  if (counts.size === 0) return null

  const names = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
  const places = points.length === 1 ? '1 place' : `${points.length} places`
  if (names.length === 1) return `${places} in ${names[0]}.`
  if (names.length === 2) return `${places} across ${names[0]} and ${names[1]}.`
  const rest = names.length - 2
  return `${places} across ${names[0]}, ${names[1]} and ${rest} more ${rest === 1 ? 'neighborhood' : 'neighborhoods'}.`
}
