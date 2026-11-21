/**
 * The one way the client writes a date.
 *
 * A bare `toLocaleDateString()` uses the zone and locale of whatever runs it.
 * The server renders in UTC (Railway, Workers) or in local time (a laptop), the
 * browser renders in the reader's zone, so the same instant could print two
 * different days -- on the page, and between the server's HTML and the
 * browser's first render, which React reports as a hydration error (#418).
 *
 * Two rules, both a fixed zone:
 * - Access dates (renewal, "access ends", grace period) are written in UTC with
 *   the month spelled out, matching the server's emails and API messages
 *   (`apps/server/src/shared/lib/dates.ts`) and Stripe's own period boundaries.
 * - Article dates (published, updated, saved) are written in UTC too, so every
 *   article surface prints the same day for the same article.
 *
 * Dependency-free so node:test can run it.
 */

export const ACCESS_DATE_TIME_ZONE = 'UTC'
export const ARTICLE_DATE_TIME_ZONE = 'UTC'

type DateInput = Date | string | number | null | undefined

function toValidDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const accessDateFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: ACCESS_DATE_TIME_ZONE,
})

/** "October 3, 2026", in UTC. `null` for a missing or unparseable value. */
export function formatAccessDate(value: DateInput): string | null {
  const date = toValidDate(value)
  return date ? accessDateFormat.format(date) : null
}

export type ArticleDateStyle =
  /** "October 3, 2026" */
  | 'long'
  /** "Oct 3, 2026" */
  | 'short'
  /** "Oct 3" */
  | 'monthDay'

const articleDateFormats: Record<ArticleDateStyle, Intl.DateTimeFormat> = {
  long: new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: ARTICLE_DATE_TIME_ZONE,
  }),
  short: new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: ARTICLE_DATE_TIME_ZONE,
  }),
  monthDay: new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: ARTICLE_DATE_TIME_ZONE,
  }),
}

/** An article's date in the fixed article zone. `null` for a missing or unparseable value. */
export function formatArticleDate(value: DateInput, style: ArticleDateStyle): string | null {
  const date = toValidDate(value)
  return date ? articleDateFormats[style].format(date) : null
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

/**
 * Weekday (0 = Sunday) and minutes past midnight at a venue, in the venue's
 * own zone (its stored `ianaTimeId`), for "Open now" in the details modal.
 * `null` for a missing or unknown zone: no guessing from the reader's clock.
 */
export function clockInTimeZone(
  now: Date,
  timeZone: string | null | undefined,
): { day: number; minutes: number } | null {
  if (!timeZone) return null
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now)
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
    const day = WEEKDAYS.indexOf(get('weekday').toLowerCase())
    if (day < 0) return null
    return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) }
  } catch {
    return null
  }
}
