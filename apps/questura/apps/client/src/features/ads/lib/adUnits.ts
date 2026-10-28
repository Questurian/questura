/**
 * The ad slot shapes the site reserves, and whether any network fills them.
 *
 * No ad network is wired in. Adsterra ran on 2026-10-17 and was removed the
 * same day: the owner could not control what it showed (casino ads, fake
 * "new message" banners) without asking their support, and Google AdSense,
 * which has self-serve blocking controls and no traffic minimum, is the next
 * candidate. Why each piece was built the way it was, and what to reuse:
 * docs/procedures/ads.md.
 *
 * What stays is network-neutral: where ads go (`adPlacement.ts`,
 * `listicleAdPlacement.ts`, the homepage `ad-slot` block) and the exact box
 * each shape reserves (`AdSurface`). Nothing draws until a network is wired
 * in, on the live site or in development (the owner's call, 2026-10-27: no
 * outlines until AdSense approves). `NEXT_PUBLIC_AD_PREVIEW=1` under
 * `pnpm dev` draws a labelled outline in each slot (`AD_PREVIEW`) to check
 * placements.
 *
 * Dependency-free so node:test can import it.
 */

export type AdUnitName = 'leaderboard' | 'mobileBanner' | 'rectangle' | 'skyscraper'

/** Exact IAB sizes, so a creative fits the box the page already reserved. */
export const AD_UNIT_SIZES: Record<AdUnitName, { width: number; height: number }> = {
  leaderboard: { width: 728, height: 90 },
  mobileBanner: { width: 320, height: 50 },
  rectangle: { width: 300, height: 250 },
  skyscraper: { width: 160, height: 600 },
}

/**
 * A slot shape: which unit fills it at which width, smallest first.
 *
 * - `banner`: the thin bar. The 728x90 wherever the slot has 728px to give
 *   it, else the 320x50. Measured on the slot's own space, not the screen: a
 *   reading column beside the rail is narrower than 728px on most laptops.
 * - `rectangle`: the 300x250 box, everywhere.
 * - `rail`: the tall slot beside an article or list. 300x250 until the rail
 *   becomes a side column at 1024px (a page layout switch, so measured on the
 *   viewport), then the 160x600 skyscraper.
 *
 * `AdSurface` sizes the box with the same thresholds (`@min-[728px]:` and
 * `1024:`); the two must change together.
 */
export type AdShape = 'banner' | 'rectangle' | 'rail'

export type AdShapeSpec = {
  /** What `minWidth` is measured on: the slot's container, or the viewport. */
  measure: 'container' | 'viewport'
  steps: ReadonlyArray<{ minWidth: number; unit: AdUnitName }>
}

export const AD_SHAPES: Record<AdShape, AdShapeSpec> = {
  banner: {
    measure: 'container',
    steps: [
      { minWidth: 0, unit: 'mobileBanner' },
      { minWidth: 728, unit: 'leaderboard' },
    ],
  },
  rectangle: { measure: 'container', steps: [{ minWidth: 0, unit: 'rectangle' }] },
  rail: {
    measure: 'viewport',
    steps: [
      { minWidth: 0, unit: 'rectangle' },
      { minWidth: 1024, unit: 'skyscraper' },
    ],
  },
}

/** The unit a shape uses at this width (container or viewport, per `measure`). */
export function adUnitForWidth(shape: AdShape, width: number): AdUnitName {
  let picked = AD_SHAPES[shape].steps[0].unit
  for (const step of AD_SHAPES[shape].steps) {
    if (width >= step.minWidth) picked = step.unit
  }
  return picked
}

/** True once a network fills the slots on the live site. None does today. */
export const ADS_LIVE = false

/** Development draws outlines where the slots go, only when asked (`NEXT_PUBLIC_AD_PREVIEW=1`). */
export const AD_PREVIEW =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_AD_PREVIEW === '1'

/**
 * The slot is drawn at all: a real ad, or a development outline. Per shape,
 * so a network that fills only some sizes can switch the others off here.
 */
export function isAdShapeOn(shape: AdShape): boolean {
  return (ADS_LIVE || AD_PREVIEW) && shape in AD_SHAPES
}
