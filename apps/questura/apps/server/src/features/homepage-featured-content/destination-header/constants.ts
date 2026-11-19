/** Longest Destination Header description, in characters. Room for a full paragraph or two. */
export const DESTINATION_HEADER_DESCRIPTION_MAX = 1500

/**
 * band: a short photo strip inside the page margins; below it the name on the left, the description on the right.
 * split: text beside the photo.
 * editorial: a magazine-proportion photo (the 4:3 editorial crop) centred, text below.
 * full: the photo edge to edge across the whole screen; name left, description right below.
 */
export const DESTINATION_HEADER_LAYOUTS = ['band', 'split', 'editorial', 'full'] as const
export type DestinationHeaderLayout = (typeof DESTINATION_HEADER_LAYOUTS)[number]

export function destinationHeaderLayout(value: unknown): DestinationHeaderLayout {
  return value === 'split' || value === 'editorial' || value === 'full' ? value : 'band'
}

/**
 * Which part of the photo stays in view, as CSS object-position percentages
 * (0 = left/top, 100 = right/bottom). The same spot is kept at every screen size.
 */
export function destinationFocus(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(n)) return 50
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10))
}
