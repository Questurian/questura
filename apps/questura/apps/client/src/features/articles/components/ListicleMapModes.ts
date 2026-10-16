/**
 * The three states of the mobile listicle map, and the geometry that puts the
 * sheet where each of them wants it.
 *
 * The sheet is always the full viewport tall; a mode only says how much of it
 * is on screen. Keeping the height fixed means the map inside never resizes -
 * switching modes is a transform, not a layout pass.
 *
 * "The viewport" is two numbers on a phone, not one. Mobile browsers hide
 * their toolbars as the reader scrolls down and bring them back on the way up,
 * and every change fires `resize` with a new `innerHeight`. Geometry built on
 * `innerHeight` therefore moved on every scroll: the sheet slid, the map
 * resized and the camera re-aimed, which reads as the map shaking. Everything
 * here is built from the small viewport (toolbars showing) and the large one
 * (toolbars hidden) instead. Both are fixed for a given window, so scrolling
 * moves nothing. The sheet hangs from the top of the screen and is the large
 * viewport tall, so whatever the toolbars do, its top edge stays put and its
 * bottom still reaches the bottom of the screen.
 *
 * Even the takeover leaves the navbar uncovered: a map with no way back to
 * the rest of the site is a trap.
 *
 * Modes are switched by the floating control only. There is deliberately no
 * drag affordance: in the takeover the sheet's top edge sits just under the
 * navbar, close enough to the top of the screen that a downward drag there is
 * the system notification-shade gesture.
 */

/**
 * Space the article leaves under its last entry so the floating switch never
 * covers copy. Also the starting guess for how much of the map the floating
 * stack hides, before it has been measured.
 *
 * Lives here, not in ListicleMapSheet, because the layout reads it on first
 * render and the sheet itself is loaded lazily.
 */
export const LISTICLE_MAP_PILL_CLEARANCE = 72

/**
 * The floating stack at the bottom of the screen (switch, active-stop chip,
 * venue card). Menus that drop down over the map stop above it.
 */
export const LISTICLE_MAP_CONTROLS_SELECTOR = '[data-listicle-map-controls]'

export type ListicleMapMode = 'list' | 'split' | 'map'

export const LISTICLE_MAP_MODES: ListicleMapMode[] = ['list', 'split', 'map']

export const LISTICLE_MAP_MODE_LABELS: Record<ListicleMapMode, string> = {
  list: 'List',
  split: 'Split',
  map: 'Map',
}

/**
 * The mode a phone reader lands in. Split, not list: with the map parked off
 * screen the only sign that the article is a map of places is a small switch
 * at the bottom, and readers did not notice it.
 */
export const INITIAL_LISTICLE_MAP_MODE: ListicleMapMode = 'split'

/**
 * Map visible in split, as a fraction of the large viewport. Split is meant to
 * say "there is a map" while the article's opening stays the first thing the
 * reader sees, so the map takes well under half the screen.
 */
export const SPLIT_VISIBLE_FRACTION = 0.42

/**
 * The viewport heights that stay fixed while the reader scrolls: `small` with
 * the browser's toolbars showing, `large` with them hidden. On a desktop
 * browser the two are equal.
 */
export interface ViewportHeights {
  small: number
  large: number
}

export function sheetHeightPx(viewport: ViewportHeights): number {
  return viewport.large
}

/**
 * Map visible in split with the toolbars hidden - the most it ever shows.
 * Measured against the large viewport so that hiding the toolbars cannot
 * grow the map past its share; with them showing it is that much less.
 */
export function splitVisibleHeight(viewport: ViewportHeights): number {
  return Math.round(viewport.large * SPLIT_VISIBLE_FRACTION)
}

/**
 * How far below the top of the screen the sheet's top edge sits.
 *
 * @param chromeTopHeight Height of page chrome the sheet must not cover - the
 * navbar. The takeover stops under it so the reader can always leave the
 * article; `split` is already low enough to clear it.
 */
export function sheetTopForMode(
  mode: ListicleMapMode,
  viewport: ViewportHeights,
  chromeTopHeight = 0,
): number {
  // Past the bottom of even the tallest viewport.
  if (mode === 'list') return viewport.large
  if (mode === 'map') return chromeTopHeight
  return viewport.large - splitVisibleHeight(viewport)
}

/**
 * Map pixels below the bottom of the screen while the toolbars are showing,
 * which is when the most of it is hidden. The camera aims above them, so the
 * active stop stays in view when the toolbars come back; hiding them only
 * uncovers more map underneath.
 */
export function hiddenBelowFold(
  mode: ListicleMapMode,
  viewport: ViewportHeights,
  chromeTopHeight = 0,
): number {
  const top = sheetTopForMode(mode, viewport, chromeTopHeight)
  return Math.min(
    Math.max(top + sheetHeightPx(viewport) - viewport.small, 0),
    sheetHeightPx(viewport),
  )
}

/**
 * The most of the page the sheet can ever cover: its top edge to the bottom
 * of the screen with the toolbars hidden.
 */
export function coveredHeight(
  mode: ListicleMapMode,
  viewport: ViewportHeights,
  chromeTopHeight = 0,
): number {
  return Math.max(viewport.large - sheetTopForMode(mode, viewport, chromeTopHeight), 0)
}
