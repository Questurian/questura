import { CONFIRM_TOKEN_TTL_MS, NEWSLETTER_SIGNUP_SOURCES, type NewsletterSignupSource, type NewsletterSubscriberStatus } from './constants'

/**
 * The numbers on Studio's "How it's doing" panel, counted from the site's own
 * list. No open or click tracking feeds this, on purpose: the privacy page
 * says readers are not tracked.
 *
 * Pure counting over rows, so the week boundaries and windows are testable
 * without a database. A re-signup overwrites `signedUpAt` and `source`, so
 * "which form" is the form of the latest signup.
 */

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

export const STATS_WEEKS = 12
export const STATS_ISSUES = 12
export const CONFIRM_RATE_LOOKBACK_DAYS = 90

export type StatsSubscriberRow = {
  status: NewsletterSubscriberStatus
  source: NewsletterSignupSource
  signedUpAt: string
  confirmedAt?: string | null
  unsubscribedAt?: string | null
  suppressedAt?: string | null
}

export type StatsIssueRow = {
  subject: string
  sentAt: string
  recipients: number
  items: unknown
}

export type IssueStats = {
  subject: string
  sentAt: string
  recipients: number
  articleCount: number
  unsubscribedAfter: number
  suppressedAfter: number
}

export type NewsletterStats = {
  weeklyConfirmed: { weekStart: string; count: number }[]
  bySource: Record<NewsletterSignupSource, number>
  confirmRate: { signedUp: number; confirmed: number; since: string }
  issues: IssueStats[]
}

const time = (value: string | null | undefined): number | null => {
  if (!value) return null
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? null : ms
}

/** Midnight UTC on the Monday of the week holding `ms`. */
export function utcWeekStart(ms: number): number {
  const day = new Date(ms)
  const midnight = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate())
  const sinceMonday = (day.getUTCDay() + 6) % 7
  return midnight - sinceMonday * DAY_MS
}

function weeklyConfirmed(rows: StatsSubscriberRow[], now: number) {
  const first = utcWeekStart(now) - (STATS_WEEKS - 1) * WEEK_MS
  const counts = new Array<number>(STATS_WEEKS).fill(0)
  for (const row of rows) {
    const confirmed = time(row.confirmedAt)
    if (confirmed === null || confirmed < first || confirmed > now) continue
    counts[Math.floor((confirmed - first) / WEEK_MS)] += 1
  }
  return counts.map((count, index) => ({
    weekStart: new Date(first + index * WEEK_MS).toISOString().slice(0, 10),
    count,
  }))
}

function bySource(rows: StatsSubscriberRow[]) {
  const counts = Object.fromEntries(NEWSLETTER_SIGNUP_SOURCES.map((source) => [source, 0])) as Record<NewsletterSignupSource, number>
  for (const row of rows) {
    if (row.status === 'subscribed' && row.source in counts) counts[row.source] += 1
  }
  return counts
}

/**
 * Of the signups whose confirmation link has expired (older than its 7 days),
 * the share that clicked it. A signup confirmed in the same instant it was
 * made is an account holder with a verified address: no mail was sent, so it
 * says nothing about whether the confirmation mail lands, and is left out.
 */
function confirmRate(rows: StatsSubscriberRow[], now: number) {
  const since = now - CONFIRM_RATE_LOOKBACK_DAYS * DAY_MS
  const until = now - CONFIRM_TOKEN_TTL_MS
  let signedUp = 0
  let confirmed = 0
  for (const row of rows) {
    const signed = time(row.signedUpAt)
    if (signed === null || signed < since || signed >= until) continue
    const confirmedAt = time(row.confirmedAt)
    if (confirmedAt === signed) continue
    signedUp += 1
    if (confirmedAt !== null && confirmedAt > signed) confirmed += 1
  }
  return { signedUp, confirmed, since: new Date(since).toISOString() }
}

/**
 * Each issue owns the time from its send until the next issue (or now).
 * Only readers who had confirmed count: a pending signup that stops or
 * bounces never received an issue.
 */
function issues(subscribers: StatsSubscriberRow[], rows: StatsIssueRow[], now: number): IssueStats[] {
  const sorted = rows
    .map((row) => ({ row, sent: time(row.sentAt) }))
    .filter((entry): entry is { row: StatsIssueRow; sent: number } => entry.sent !== null)
    .sort((a, b) => b.sent - a.sent)
    .slice(0, STATS_ISSUES)
  const readers = subscribers.filter((row) => time(row.confirmedAt) !== null)

  return sorted.map(({ row, sent }, index) => {
    const end = index === 0 ? now : sorted[index - 1]!.sent
    const inWindow = (value: string | null | undefined) => {
      const at = time(value)
      return at !== null && at >= sent && at < end
    }
    return {
      subject: row.subject,
      sentAt: new Date(sent).toISOString(),
      recipients: row.recipients,
      articleCount: Array.isArray(row.items) ? row.items.length : 0,
      unsubscribedAfter: readers.filter((reader) => inWindow(reader.unsubscribedAt)).length,
      suppressedAfter: readers.filter((reader) => inWindow(reader.suppressedAt)).length,
    }
  })
}

export function computeStats(
  subscribers: StatsSubscriberRow[],
  issueRows: StatsIssueRow[],
  now: Date = new Date(),
): NewsletterStats {
  const nowMs = now.getTime()
  return {
    weeklyConfirmed: weeklyConfirmed(subscribers, nowMs),
    bySource: bySource(subscribers),
    confirmRate: confirmRate(subscribers, nowMs),
    issues: issues(subscribers, issueRows, nowMs),
  }
}
