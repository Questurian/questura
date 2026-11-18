/** Longest Destination Header description, in characters. Room for a full paragraph or two. */
export const DESTINATION_HEADER_DESCRIPTION_MAX = 1500

/** A: the photo inside the page margins, text centred below. C: text beside the photo. */
export const DESTINATION_HEADER_LAYOUTS = ['band', 'split'] as const
export type DestinationHeaderLayout = (typeof DESTINATION_HEADER_LAYOUTS)[number]

export function destinationHeaderLayout(value: unknown): DestinationHeaderLayout {
  return value === 'split' ? 'split' : 'band'
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
