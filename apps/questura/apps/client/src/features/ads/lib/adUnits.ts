/**
 * The ad network's units, and the slot shapes the site builds from them.
 *
 * The network is Adsterra, banners only (2026-10-17 owner decision: no
 * popunders, social bar, interstitials or native tiles -- fixed sizes are what
 * keep a slot from shoving the page under the reader). Each banner size is its
 * own unit in the Adsterra dashboard with its own key.
 *
 * TO TURN ADS ON: in the Adsterra publisher dashboard, add the site, create one
 * banner unit per size below, open each unit's "Get code", and paste the
 * `key` from its `atOptions` into `UNIT_KEYS`. Also check the script address
 * in that snippet: if it is not `ADSTERRA_SCRIPT_ORIGIN`, change it here too.
 * Keys are not secrets -- every visitor's browser sees them in the page. Merge
 * to main and the deploy ships it. Full checklist: docs/procedures/ads.md.
 *
 * A shape is live only when every unit it uses has a key, so a half-configured
 * shape draws nothing rather than a gap on phones. In development, shapes with
 * no key draw a labelled outline instead (`AD_PREVIEW`) so placements can be
 * seen while laying pages out; `NEXT_PUBLIC_AD_PREVIEW=0` turns that off.
 *
 * Dependency-free so node:test can import it.
 */

/** Where Adsterra serves banner code from. Check it against the "Get code" snippet. */
export const ADSTERRA_SCRIPT_ORIGIN = 'https://www.highperformanceformat.com'

export type AdUnitName = 'leaderboard' | 'mobileBanner' | 'rectangle' | 'skyscraper'

export type AdUnitKeys = Record<AdUnitName, string>

/** One key per Adsterra banner unit. Empty means that size is off. */
const UNIT_KEYS: AdUnitKeys = {
  /** 728x90 */
  leaderboard: '',
  /** 320x50 */
  mobileBanner: '',
  /** 300x250 */
  rectangle: '',
  /** 160x600 */
  skyscraper: '',
}

/** Exact IAB sizes, so the creative fits the box the page already reserved. */
export const AD_UNIT_SIZES: Record<AdUnitName, { width: number; height: number }> = {
  leaderboard: { width: 728, height: 90 },
  mobileBanner: { width: 320, height: 50 },
  rectangle: { width: 300, height: 250 },
  skyscraper: { width: 160, height: 600 },
}

export type AdUnit = { name: AdUnitName; key: string; width: number; height: number }

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

/** Adsterra keys are 32 hex characters; anything else is a paste mistake. */
const KEY_PATTERN = /^[a-z0-9]{16,64}$/i

export function isValidAdKey(key: string): boolean {
  return KEY_PATTERN.test(key)
}

export function adUnit(name: AdUnitName, keys: AdUnitKeys = UNIT_KEYS): AdUnit {
  return { name, key: keys[name], ...AD_UNIT_SIZES[name] }
}

/** The smallest width of the step `width` falls on. */
export function adStepWidth(shape: AdShape, width: number): number {
  let picked = 0
  for (const step of AD_SHAPES[shape].steps) {
    if (width >= step.minWidth) picked = step.minWidth
  }
  return picked
}

/** The unit a shape uses at this width (container or viewport, per `measure`). */
export function adUnitForWidth(
  shape: AdShape,
  width: number,
  keys: AdUnitKeys = UNIT_KEYS,
): AdUnit {
  let picked = AD_SHAPES[shape].steps[0].unit
  for (const step of AD_SHAPES[shape].steps) {
    if (width >= step.minWidth) picked = step.unit
  }
  return adUnit(picked, keys)
}

/** Every unit the shape uses has a real key. */
export function isAdShapeLive(shape: AdShape, keys: AdUnitKeys = UNIT_KEYS): boolean {
  return AD_SHAPES[shape].steps.every((step) => isValidAdKey(keys[step.unit]))
}

/** Development draws outlines where unkeyed slots would go. */
export const AD_PREVIEW =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_AD_PREVIEW !== '0'

/** The slot is drawn at all: a real ad, or a development outline. */
export function isAdShapeOn(shape: AdShape): boolean {
  return isAdShapeLive(shape) || AD_PREVIEW
}

/** At least one shape serves real ads. The privacy page keys its ads paragraph off this. */
export const ADS_LIVE = (Object.keys(AD_SHAPES) as AdShape[]).some((shape) => isAdShapeLive(shape))
