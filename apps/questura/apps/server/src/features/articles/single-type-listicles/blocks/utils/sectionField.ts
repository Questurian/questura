import type { Field } from 'payload'

/** Longest section name that still sits on one line on a phone. */
export const LISTICLE_SECTION_MAX_LENGTH = 12

/**
 * Section heading for a single-type listicle, typed by the editor (owner,
 * 2026-11-15). Places next to each other with the same section sit under one
 * heading; the website sets it in capitals between double rules, so the name
 * is capped to fit one line on a phone. Replaces the moment catalogue here.
 */
export const listicleSectionField: Field = {
  name: 'section',
  label: 'Section',
  type: 'text',
  maxLength: LISTICLE_SECTION_MAX_LENGTH,
  admin: {
    description: `Optional. Up to ${LISTICLE_SECTION_MAX_LENGTH} characters. Places next to each other with the same section show under one heading.`,
  },
}
