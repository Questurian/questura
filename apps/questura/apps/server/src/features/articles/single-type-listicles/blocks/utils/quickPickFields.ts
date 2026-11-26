import type { Field } from 'payload'

/** Longest pick label that still sits on one line in the box on a phone. */
export const LISTICLE_PICK_MAX_LENGTH = 14

/** Longest pick note that stays within two lines in the box on a phone. */
export const LISTICLE_PICK_NOTE_MAX_LENGTH = 60

/**
 * Quick picks for a single-type listicle (owner, 2026-11-26). A place with a
 * pick label is listed in the Quick picks box under the page header, in list
 * order: the label names the reader's need ("Salsa", "Over 30"), the place's
 * name links to its entry, and the note gives one line of facts ("Miraflores ·
 * every night"). Put the answer on the first screen for someone who arrives
 * from a search.
 */
export const listicleQuickPickFields: Field[] = [
  {
    name: 'pick',
    label: 'Quick pick',
    type: 'text',
    maxLength: LISTICLE_PICK_MAX_LENGTH,
    admin: {
      description: `Optional. Up to ${LISTICLE_PICK_MAX_LENGTH} characters, e.g. "Salsa" or "First night". Places with one are listed in the Quick picks box at the top of the page.`,
    },
  },
  {
    name: 'pickNote',
    label: 'Quick pick note',
    type: 'text',
    maxLength: LISTICLE_PICK_NOTE_MAX_LENGTH,
    admin: {
      description: `Optional. Up to ${LISTICLE_PICK_NOTE_MAX_LENGTH} characters, shown under the place in the Quick picks box, e.g. "Miraflores · every night".`,
      condition: (_data, siblingData) => Boolean(siblingData?.pick),
    },
  },
]
