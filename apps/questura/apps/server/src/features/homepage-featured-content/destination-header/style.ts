/**
 * The one look every Destination Header shares (ABW "Header style" panel).
 * The crumb ("[flag] PERU › LIMA") and the name never change; these choices
 * only restyle the description, so a change reaches every city at once.
 */
export const DESTINATION_HEADER_STYLE_SLUG = 'destination-header-style'

export const DESTINATION_HEADER_TEXT_FONTS = [
  'jost',
  'lato',
  'raleway',
  'manrope',
  'dmsans',
  'worksans',
  'serif',
] as const
export const DESTINATION_HEADER_TEXT_WEIGHTS = ['300', '400'] as const
export const DESTINATION_HEADER_TEXT_SIZES = ['13', '14', '15', '16'] as const
/** grey = ink at 70%; ink = solid. */
export const DESTINATION_HEADER_TEXT_TONES = ['grey', 'ink'] as const
/** top = the first line starts level with the name's capitals; centre = the paragraph centres on the crumb and name. */
export const DESTINATION_HEADER_TEXT_ALIGNS = ['top', 'centre'] as const

export type DestinationHeaderStyle = {
  textFont: (typeof DESTINATION_HEADER_TEXT_FONTS)[number]
  textWeight: (typeof DESTINATION_HEADER_TEXT_WEIGHTS)[number]
  textSize: (typeof DESTINATION_HEADER_TEXT_SIZES)[number]
  textTone: (typeof DESTINATION_HEADER_TEXT_TONES)[number]
  textAlign: (typeof DESTINATION_HEADER_TEXT_ALIGNS)[number]
}

export const DEFAULT_DESTINATION_HEADER_STYLE: DestinationHeaderStyle = {
  textFont: 'jost',
  textWeight: '300',
  textSize: '15',
  textTone: 'grey',
  textAlign: 'top',
}

function pick<T extends readonly string[]>(options: T, value: unknown, fallback: T[number]): T[number] {
  const text = typeof value === 'number' ? String(value) : value
  return typeof text === 'string' && (options as readonly string[]).includes(text) ? (text as T[number]) : fallback
}

/** Any stored value (or none) to a complete, valid style; unknown values fall back to the defaults. */
export function destinationHeaderStyle(raw: unknown): DestinationHeaderStyle {
  const doc = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const d = DEFAULT_DESTINATION_HEADER_STYLE
  return {
    textFont: pick(DESTINATION_HEADER_TEXT_FONTS, doc.textFont, d.textFont),
    textWeight: pick(DESTINATION_HEADER_TEXT_WEIGHTS, doc.textWeight, d.textWeight),
    textSize: pick(DESTINATION_HEADER_TEXT_SIZES, doc.textSize, d.textSize),
    textTone: pick(DESTINATION_HEADER_TEXT_TONES, doc.textTone, d.textTone),
    textAlign: pick(DESTINATION_HEADER_TEXT_ALIGNS, doc.textAlign, d.textAlign),
  }
}
