import type { Field } from 'payload'

/** Longest detail that stays on one line under the name on a phone. */
export const LISTICLE_HEADING_DETAIL_MAX_LENGTH = 60

/**
 * A short line under the place's numbered name on a map listicle (owner,
 * 2026-11-28), e.g. "18 floors above the malecón". It sits inside the
 * heading, so Google can build a "1. 27 Tapas, 18 floors above the malecón ·
 * 2. …" list under the search result, the way it does for other Lima lists.
 */
export const listicleHeadingDetailField: Field = {
  name: 'headingDetail',
  label: 'Heading detail',
  type: 'text',
  maxLength: LISTICLE_HEADING_DETAIL_MAX_LENGTH,
  admin: {
    description: `Optional. Up to ${LISTICLE_HEADING_DETAIL_MAX_LENGTH} characters, shown in small italics under the place's name, e.g. "18 floors above the malecón". Lowercase start, no full stop.`,
  },
}
