/**
 * Questurian Maps plate themes. `blue` sets the block on a full-bleed blue
 * field with cream type; `inverted` keeps the page ground and turns the
 * title, pin and labels blue. A block with no stored value is `blue`.
 */
export const MAPS_THEME_VALUES = ['blue', 'inverted'] as const

export type MapsTheme = (typeof MAPS_THEME_VALUES)[number]

export const DEFAULT_MAPS_THEME: MapsTheme = 'blue'
