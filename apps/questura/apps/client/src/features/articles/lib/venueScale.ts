/**
 * Nightlife's word scales (energy, tourists, venue size, price) as filled
 * segments for the details modal's "At a glance" bars. The words are free
 * text from the location data; one we do not know draws no bar, only the word.
 */

export type ScaleReading = { filled: number; of: number }

const LEVELS: Record<string, number> = {
  'very low': 1,
  low: 2,
  medium: 3,
  moderate: 3,
  high: 4,
  'very high': 5,
}

const SIZES: Record<string, number> = {
  intimate: 1,
  small: 2,
  medium: 3,
  large: 4,
  'very large': 5,
  huge: 5,
}

function key(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
}

/** "High" → 4 of 5. */
export function levelScale(value: string): ScaleReading | null {
  const filled = LEVELS[key(value)]
  return filled ? { filled, of: 5 } : null
}

/** "Large" → 4 of 5. */
export function sizeScale(value: string): ScaleReading | null {
  const filled = SIZES[key(value)]
  return filled ? { filled, of: 5 } : null
}

/** "$$$" → 3 of 4. */
export function priceScale(value: string): ScaleReading | null {
  const trimmed = value.trim()
  return /^\${1,4}$/.test(trimmed) ? { filled: trimmed.length, of: 4 } : null
}
