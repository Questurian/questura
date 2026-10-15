import { DEFAULT_MAPS_THEME, MAPS_THEME_VALUES, type MapsTheme } from '../constants'

export function normalizeMapsTheme(raw: unknown): MapsTheme {
  return (MAPS_THEME_VALUES as readonly unknown[]).includes(raw) ? (raw as MapsTheme) : DEFAULT_MAPS_THEME
}

type ParseResult =
  | { ok: true; omit: true }
  | { ok: true; omit: false; value: MapsTheme }
  | { ok: false; message: string }

/** `null` resets to the default; anything outside the list is a 400. */
export function parseMapsThemeBodyField(body: Record<string, unknown>): ParseResult {
  if (!Object.prototype.hasOwnProperty.call(body, 'mapsTheme')) {
    return { ok: true, omit: true }
  }

  const v = body.mapsTheme
  if (v === null) {
    return { ok: true, omit: false, value: DEFAULT_MAPS_THEME }
  }
  if (typeof v !== 'string' || !(MAPS_THEME_VALUES as readonly string[]).includes(v)) {
    return { ok: false, message: `mapsTheme must be one of: ${MAPS_THEME_VALUES.join(', ')}.` }
  }

  return { ok: true, omit: false, value: v as MapsTheme }
}
