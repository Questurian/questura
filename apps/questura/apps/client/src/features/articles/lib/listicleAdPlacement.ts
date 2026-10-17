/**
 * Where an ad sits on a listicle.
 *
 * A listicle is not prose, so none of the standard-article reasoning applies.
 * The page is already a stack of discrete units separated by rules, which means
 * an ad between two of them is reading *with* the format rather than
 * interrupting it -- and it means the slot can be the full rectangle, where the
 * reading column only ever gets a thin bar.
 *
 * Cadence is by item, not by word: one after the intro, then one after every
 * `EVERY_N_ITEMS`. Two guards. The tail -- an ad after the last entry is not
 * in the list, it is furniture below it, and the related-articles shelf
 * already closes the page. And the ceiling, `MAX_LISTICLE_ADS` (owner decision
 * 2026-10-17: 6): a long list widens the gap between ads until it fits, so
 * they still run the whole length instead of stopping halfway. The footer's
 * own two slots (`ListicleArticleFooter`) are outside the list and not counted.
 *
 * Dependency-free on purpose, same as `adPlacement`, so `pnpm test` can run it
 * through `node --experimental-strip-types`.
 */

/** One ad per this many entries. */
export const EVERY_N_ITEMS = 2

/** Most ads in one list, the intro slot included. 0 means no ceiling. */
export const MAX_LISTICLE_ADS = 6

export type ListicleAdPlan = {
  /** An ad sits between the intro and the first entry. */
  afterIntro: boolean
  /** Zero-based item indices to render an ad after. */
  afterItem: Set<number>
  count: number
}

export type ListicleAdPlanOptions = {
  /**
   * Master switch -- the hook for "membership is the ad-free tier" once the
   * client knows who is reading.
   */
  enabled?: boolean
  /** There is an intro above the list for a slot to follow. */
  hasIntro?: boolean
  /** Override the cadence. */
  everyNItems?: number
  /** Override the ceiling; 0 means none. */
  maxAds?: number
}

export function planListicleAds(
  itemCount: number,
  options: ListicleAdPlanOptions = {},
): ListicleAdPlan {
  const {
    enabled = true,
    hasIntro = true,
    everyNItems = EVERY_N_ITEMS,
    maxAds = MAX_LISTICLE_ADS,
  } = options
  const plan: ListicleAdPlan = { afterIntro: false, afterItem: new Set(), count: 0 }
  if (!enabled || itemCount < 1 || everyNItems < 1) return plan

  // Only worth an opening slot if the list actually continues past it.
  if (hasIntro && itemCount >= 1) {
    plan.afterIntro = true
    plan.count += 1
  }

  // Slots between entries at a given gap: one after every `gap`-th entry, never
  // after the last. Widen the gap until they fit under the ceiling.
  const between = (gap: number) => Math.floor((itemCount - 1) / gap)
  const budget = maxAds > 0 ? Math.max(0, maxAds - plan.count) : Infinity
  let gap = everyNItems
  while (between(gap) > budget && gap < itemCount) gap += 1

  for (let index = 0; index < itemCount - 1; index += 1) {
    if ((index + 1) % gap !== 0 || plan.count >= (maxAds > 0 ? maxAds : Infinity)) continue
    plan.afterItem.add(index)
    plan.count += 1
  }

  return plan
}
