import type { Field } from 'payload'

/**
 * Access tier: what an editorial item costs to read (ADR-0009).
 *
 * Declared per document and never inferred from collection, category or tag.
 * A blanket rule cannot express "this itinerary is the free sample", which is
 * the thing that sells the paid ones.
 */
export const ACCESS_TIERS = ['free', 'member'] as const

export type AccessTier = (typeof ACCESS_TIERS)[number]

/**
 * What a stored value that is missing or unrecognised reads as. Kept `free` to
 * agree with `isGatedItem` below: a bad tier string must never make a document
 * unreadable to a paying member.
 */
export const DEFAULT_ACCESS_TIER: AccessTier = 'free'

/**
 * What a newly created document starts as. `member` because the site launches
 * with every article and itinerary behind the paywall (owner decision,
 * 2026-10-15); making one free is the deliberate act. This only fills the
 * field on create -- it never reinterprets a stored value, which is
 * `DEFAULT_ACCESS_TIER`'s job.
 */
export const NEW_DOCUMENT_ACCESS_TIER: AccessTier = 'member'

export function isAccessTier(value: unknown): value is AccessTier {
  return typeof value === 'string' && (ACCESS_TIERS as readonly string[]).includes(value)
}

/**
 * Whether a document is a Gated item.
 *
 * Fails closed the other way on purpose: an unrecognised or absent value reads
 * as `free`, so a document can never become unreadable because of a bad tier
 * string. Gating something requires saying so explicitly; the money bug this
 * work exists to close is content served for free, and the mirror-image bug --
 * content a paying member cannot read -- is the one that generates disputes.
 */
export function isGatedItem(doc: unknown): boolean {
  if (!doc || typeof doc !== 'object') return false
  return (doc as { access?: unknown }).access === 'member'
}

export const accessTierField: Field = {
  name: 'access',
  type: 'select',
  required: true,
  defaultValue: NEW_DOCUMENT_ACCESS_TIER,
  options: [
    { label: 'Free — the whole item is public', value: 'free' },
    { label: 'Members only — free sample, then paywall', value: 'member' },
  ],
  admin: {
    position: 'sidebar',
    description:
      'Members only shows every reader a free sample and requires a membership for the rest. The sample is derived automatically — there is nothing to mark up in the body.',
  },
}
