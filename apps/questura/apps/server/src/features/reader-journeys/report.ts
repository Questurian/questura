/**
 * The shape `POST /api/public/journeys` accepts, and nothing else (ADR-0019).
 *
 * Anybody can post here, so every field is checked, capped and treated as
 * text to show. Nothing typed by a reader is in the shape at all.
 */

export const MAX_REPORT_BYTES = 16 * 1024
export const MAX_EVENTS = 100

/**
 * `t` is seconds on screen into the view. `d` is how long the thing was on
 * screen, for the kinds that have a duration.
 */
export const EVENT_KINDS = ['section', 'paywall', 'price', 'tap', 'map', 'field', 'checkout', 'away'] as const
export type JourneyEventKind = (typeof EVENT_KINDS)[number]
export type JourneyEvent = { t: number; k: JourneyEventKind; x?: string; d?: number }

export type JourneyReport = {
  viewerId: string
  visitId: string
  viewId: string
  seq: number
  path: string
  seconds: number
  scroll: number
  events: JourneyEvent[]
  region: string | null
  city: string | null
  source: string | null
  campaign: string | null
  language: string | null
}

export type ParsedBody = { forget: string } | { report: JourneyReport } | null

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const KINDS = new Set<string>(EVENT_KINDS)
const MAX_SECONDS = 6 * 60 * 60
const CONTROL = /[\u0000-\u001f\u007f‪-‮⁦-⁩]/g

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const clean = value.slice(0, 400).replace(CONTROL, ' ').replace(/\s+/g, ' ').trim()
  // An address has no business in any of these fields. A plain search, not a
  // pattern: an address pattern takes quadratic time on 16 KB of junk.
  if (!clean || value.includes('@')) return null
  // Not slice(): half a surrogate pair is invalid JSON to Postgres.
  return Array.from(clean).slice(0, max).join('').replace(/\p{Surrogate}/gu, '\ufffd')
}

function whole(value: unknown, max: number): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max ? value : null
}

function uuid(value: unknown): string | null {
  return typeof value === 'string' && UUID.test(value) ? value : null
}

function event(value: unknown): JourneyEvent | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  const t = whole(input.t, MAX_SECONDS)
  if (t === null || typeof input.k !== 'string' || !KINDS.has(input.k)) return null
  const out: JourneyEvent = { t, k: input.k as JourneyEventKind }
  const x = text(input.x, 80)
  if (x) out.x = x
  const d = whole(input.d, MAX_SECONDS)
  if (d !== null) out.d = d
  return out
}

export function parseJourneyBody(raw: string): ParsedBody {
  if (raw.length > MAX_REPORT_BYTES) return null
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return null
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const input = body as Record<string, unknown>

  if ('forget' in input) {
    const forget = uuid(input.forget)
    return forget ? { forget } : null
  }

  const viewerId = uuid(input.viewerId)
  const visitId = uuid(input.visitId)
  const viewId = uuid(input.viewId)
  const seq = whole(input.seq, 1_000_000)
  const seconds = whole(input.seconds, MAX_SECONDS)
  const scroll = whole(input.scroll, 100)
  const path = typeof input.path === 'string' ? input.path : ''
  if (!viewerId || !visitId || !viewId || seq === null || seconds === null || scroll === null) return null
  // A pathname only: a query string can carry a token.
  if (!/^\/(?!\/)[\w\-./~%]*$/.test(path) || path.length > 300) return null
  if (!Array.isArray(input.events) || input.events.length > MAX_EVENTS) return null

  const events: JourneyEvent[] = []
  for (const entry of input.events) {
    const parsed = event(entry)
    if (!parsed) return null
    events.push(parsed)
  }

  return {
    report: {
      viewerId,
      visitId,
      viewId,
      seq,
      path,
      seconds,
      scroll,
      events,
      region: text(input.region, 40),
      city: text(input.city, 60),
      source: text(input.source, 80),
      campaign: text(input.campaign, 60),
      language: text(input.language, 20),
    },
  }
}
