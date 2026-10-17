/**
 * The shapes an editor can drop between homepage blocks. `banner` is the thin
 * leaderboard (320x50 on phones, 728x90 from 640px up); `rectangle` is the
 * 300x250 box. The client maps each shape to its ad network units, and draws
 * nothing for a shape whose units are not configured yet. A block with no
 * stored value is `banner`.
 *
 * The same two words as the in-article ad variants on the client
 * (`features/articles/lib/adPlacement.ts`), so a slot means one thing site-wide.
 */
export const AD_SLOT_SIZE_VALUES = ['banner', 'rectangle'] as const

export type AdSlotSize = (typeof AD_SLOT_SIZE_VALUES)[number]

export const DEFAULT_AD_SLOT_SIZE: AdSlotSize = 'banner'
