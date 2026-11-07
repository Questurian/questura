import type { Field } from 'payload'
import { normalizeRelationshipIds } from './itemMedia/relationshipIds'

export const TOUR_PICKS_MAX = 4

/**
 * Tour Picks (ADR 0013): the curated, ordered tours featured on one listicle
 * entry. Stored as live references — tour content stays canonical in Location
 * Manager → Payload. A pick can be any tour: the tours linked to the place in
 * Location Manager are only the builder's first suggestions, because a tour
 * near a place is a recommendation, not something bound to it.
 */
export const createTourPicksField = (): Field => ({
  name: 'tours',
  label: 'Tour Picks',
  type: 'relationship',
  relationTo: 'tours',
  hasMany: true,
  maxRows: TOUR_PICKS_MAX,
  admin: {
    description: `Tour Picks: up to ${TOUR_PICKS_MAX} tours, in display order`,
  },
})

/**
 * Server-side enforcement of the Tour Picks cap (maxRows only guards the admin
 * UI, not API writes).
 */
export const validateTourPicks = (params: { blockTours: unknown; itemLabel: string }): void => {
  const { blockTours, itemLabel } = params

  if (normalizeRelationshipIds(blockTours).length > TOUR_PICKS_MAX) {
    throw new Error(`${itemLabel} can feature at most ${TOUR_PICKS_MAX} tour picks.`)
  }
}
