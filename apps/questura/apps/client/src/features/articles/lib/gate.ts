/**
 * Reader-facing lock state, as sent by the Questura Server public routes.
 *
 * Always present on an article payload, on free items too, so the client never
 * has to infer "locked" from an absent key.
 */
/**
 * Marks the element standing in for the withheld content; the paywall JSON-LD
 * points at it with `cssSelector` (ADR-0009). It lives here, not beside the
 * JSON-LD builder, because `PaywallNotice` is browser code: importing it from
 * `articleJsonLd.ts` shipped that whole builder to every article page.
 */
export const PAYWALL_CLASS = 'paywalled'

export type GateState = {
  access: 'free' | 'member'
  locked: boolean
  unit: 'blocks' | 'items' | 'days'
  shown: number
  total: number
  /**
   * Where each withheld stop of a locked itinerary sits on the map. Positions
   * only; the server sends nothing else about a stop. Empty for everything
   * that is not a locked itinerary.
   */
  mapPins: GateMapPin[]
}

export type GateMapPin = { lat: number; lng: number }

function readMapPins(value: unknown): GateMapPin[] {
  if (!Array.isArray(value)) return []

  const pins: GateMapPin[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const { lat, lng } = entry as { lat?: unknown; lng?: unknown }
    if (typeof lat !== 'number' || typeof lng !== 'number') continue
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    pins.push({ lat, lng })
  }
  return pins
}

export function readGate(article: unknown): GateState | null {
  if (!article || typeof article !== 'object') return null
  const gate = (article as { gate?: unknown }).gate
  if (!gate || typeof gate !== 'object') return null

  const candidate = gate as Partial<GateState>
  if (typeof candidate.locked !== 'boolean') return null

  return {
    access: candidate.access === 'member' ? 'member' : 'free',
    locked: candidate.locked,
    unit:
      candidate.unit === 'items' || candidate.unit === 'days' ? candidate.unit : 'blocks',
    shown: Number.isFinite(candidate.shown) ? Number(candidate.shown) : 0,
    total: Number.isFinite(candidate.total) ? Number(candidate.total) : 0,
    mapPins: readMapPins(candidate.mapPins),
  }
}

export function isLocked(article: unknown): boolean {
  return readGate(article)?.locked === true
}

export type LockCopy = {
  /** What the reader is looking at, or null when there is nothing useful to say. */
  headline: string | null
  cta: string
}

/**
 * The button says what to do, not what is behind it: "Unlock the full day"
 * left a signed-out reader guessing that unlocking means joining.
 */
const UNLOCK_CTA = 'Become a member to unlock'

/**
 * Names what is being withheld, in the unit the server actually cut on.
 *
 * Itineraries keep no day at all, so the old "Day 1 of 5" phrasing would read
 * as "Day 0 of 5" -- which sounds like a bug rather than an offer.
 */
export function describeLock(gate: GateState): LockCopy {
  if (!gate.locked) return { headline: null, cta: UNLOCK_CTA }

  if (gate.unit === 'days') {
    return {
      headline: 'Your stay is above. The day-by-day plan is for members.',
      cta: UNLOCK_CTA,
    }
  }

  if (gate.total > gate.shown && gate.shown > 0) {
    return {
      headline: `You're reading the first ${gate.shown} of ${gate.total} sections.`,
      cta: UNLOCK_CTA,
    }
  }

  return { headline: null, cta: UNLOCK_CTA }
}
