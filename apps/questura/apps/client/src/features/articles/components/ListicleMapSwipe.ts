/**
 * One-finger swipe between stops on the phone's full-screen map.
 *
 * Google's default touch handling on a scrollable page ("cooperative") reads
 * a one-finger drag as an attempt to scroll the page and answers with its
 * "use two fingers to move the map" message. The takeover claims the
 * one-finger drag instead: a horizontal swipe steps to the next or previous
 * stop, exactly like the arrows, and two fingers still pan and zoom the map.
 * Google allows a page to decide this; nothing here touches its UI.
 */

type SteppablePoint = { id: string; inert?: boolean }

/** The stops either side of the active one, in list order (inert pins skipped). */
export function adjacentStops<T extends SteppablePoint>(
  allPoints: readonly T[],
  activeId: string | null,
): { points: T[]; previous: T | null; next: T | null } {
  const points = allPoints.filter((point) => !point.inert)
  const index = points.findIndex((point) => point.id === activeId)
  // No active stop means the reader is looking at every pin; forward starts
  // the walk, back has nowhere to go.
  const previous = index > 0 ? points[index - 1] : null
  const next = index < 0 ? (points[0] ?? null) : (points[index + 1] ?? null)
  return { points, previous, next }
}

/** Shortest horizontal travel that counts as a swipe, in CSS px. */
export const SWIPE_MIN_DISTANCE = 48
/** Horizontal travel must beat vertical by this factor. */
export const SWIPE_AXIS_RATIO = 1.4

export type SwipeDirection = 'next' | 'previous'

/**
 * A finished one-finger gesture, as a step or nothing. Leftward is "next",
 * the way a card deck or photo carousel moves.
 */
export function classifySwipe(dx: number, dy: number): SwipeDirection | null {
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return null
  if (Math.abs(dx) < Math.abs(dy) * SWIPE_AXIS_RATIO) return null
  return dx < 0 ? 'next' : 'previous'
}
