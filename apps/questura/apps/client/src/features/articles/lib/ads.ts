import { AD_PREVIEW, ADS_LIVE } from '../../ads/lib/adUnits.ts'

/**
 * Master switch for the in-article ad planners.
 *
 * On once any ad size has a unit key (`features/ads/lib/adUnits.ts`), or in
 * development, where unkeyed slots draw outlines. Each slot still checks its
 * own size (`isAdShapeOn`), so a planned slot whose size has no key draws
 * nothing. Off, the planners place nothing and the rail gives its pinned spot
 * to Trending (Questurian/questura#6: empty mocks read as unfinished).
 */
export const ADS_ENABLED = ADS_LIVE || AD_PREVIEW
