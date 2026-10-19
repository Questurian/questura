import type { GatedPhase } from './useGatedFullArticle'

/**
 * Which map a guide's reader gets (owner decision, 2026-10-19).
 *
 * - `open`: the Google map. Free guides, and a member once their full guide
 *   has arrived.
 * - `teaser`: the drawn map teaser. A reader we know is not a member never
 *   loads Google at all: a Google map is billed per load, and a locked page
 *   refreshed on a loop, or crawled, was a bill with no ceiling.
 * - `waiting`: plain paper while we find out who is reading, or while a
 *   member's guide is loading, or when the check failed. Neither the teaser,
 *   which would tell a paying member to join, nor a billed map we may not owe.
 */
export type ListicleMapAccess = 'open' | 'teaser' | 'waiting'

export function mapAccessFor(locked: boolean, phase: GatedPhase): ListicleMapAccess {
  if (!locked || phase === 'ready') return 'open'
  if (phase === 'anonymous') return 'teaser'
  return 'waiting'
}
