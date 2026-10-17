import { AD_SLOT_SIZE_VALUES, DEFAULT_AD_SLOT_SIZE, type AdSlotSize } from '../constants'

export function normalizeAdSlotSize(raw: unknown): AdSlotSize {
  return (AD_SLOT_SIZE_VALUES as readonly unknown[]).includes(raw)
    ? (raw as AdSlotSize)
    : DEFAULT_AD_SLOT_SIZE
}

type ParseResult =
  | { ok: true; omit: true }
  | { ok: true; omit: false; value: AdSlotSize }
  | { ok: false; message: string }

/** `null` resets to the default; anything outside the list is a 400. */
export function parseAdSlotSizeBodyField(body: Record<string, unknown>): ParseResult {
  if (!Object.prototype.hasOwnProperty.call(body, 'adSize')) {
    return { ok: true, omit: true }
  }

  const v = body.adSize
  if (v === null) {
    return { ok: true, omit: false, value: DEFAULT_AD_SLOT_SIZE }
  }
  if (typeof v !== 'string' || !(AD_SLOT_SIZE_VALUES as readonly string[]).includes(v)) {
    return { ok: false, message: `adSize must be one of: ${AD_SLOT_SIZE_VALUES.join(', ')}.` }
  }

  return { ok: true, omit: false, value: v as AdSlotSize }
}
