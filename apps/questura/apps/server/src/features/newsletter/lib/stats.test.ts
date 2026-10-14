import { describe, expect, it } from 'vitest'

import { computeStats, utcWeekStart, type StatsIssueRow, type StatsSubscriberRow } from './stats'

// A Wednesday.
const NOW = new Date('2026-10-14T12:00:00.000Z')

function reader(overrides: Partial<StatsSubscriberRow> = {}): StatsSubscriberRow {
  return { status: 'subscribed', source: 'homepage-block', signedUpAt: '2026-10-01T09:00:00.000Z', ...overrides }
}

function issue(overrides: Partial<StatsIssueRow> = {}): StatsIssueRow {
  return { subject: 'Issue', sentAt: '2026-10-01T10:00:00.000Z', recipients: 100, items: [], ...overrides }
}

describe('utcWeekStart', () => {
  it('starts weeks at Monday midnight UTC, Sunday belonging to the week before', () => {
    expect(new Date(utcWeekStart(Date.parse('2026-10-14T12:00:00Z'))).toISOString()).toBe('2026-10-12T00:00:00.000Z')
    expect(new Date(utcWeekStart(Date.parse('2026-10-12T00:00:00Z'))).toISOString()).toBe('2026-10-12T00:00:00.000Z')
    expect(new Date(utcWeekStart(Date.parse('2026-10-11T23:59:59Z'))).toISOString()).toBe('2026-10-05T00:00:00.000Z')
  })
})

describe('computeStats', () => {
  it('answers zeros for an empty list', () => {
    const stats = computeStats([], [], NOW)
    expect(stats.weeklyConfirmed).toHaveLength(12)
    expect(stats.weeklyConfirmed.every((week) => week.count === 0)).toBe(true)
    expect(stats.bySource).toEqual({ 'homepage-block': 0, 'newsletters-page': 0, 'article-end': 0, account: 0 })
    expect(stats.confirmRate).toEqual({ signedUp: 0, confirmed: 0, since: '2026-07-16T12:00:00.000Z' })
    expect(stats.issues).toEqual([])
  })

  it('zero-fills twelve UTC Monday weeks and buckets confirmations by confirmedAt', () => {
    const stats = computeStats(
      [
        reader({ confirmedAt: '2026-10-12T00:00:00.000Z' }), // this week, first instant
        reader({ confirmedAt: '2026-10-11T23:59:59.000Z' }), // last week, last instant
        reader({ status: 'unsubscribed', confirmedAt: '2026-10-06T08:00:00.000Z' }), // still a confirmation that week
        reader({ confirmedAt: '2026-07-27T00:00:00.000Z' }), // first week shown
        reader({ confirmedAt: '2026-07-26T23:59:59.000Z' }), // before the window
        reader({ status: 'pending' }), // never confirmed
      ],
      [],
      NOW,
    )
    expect(stats.weeklyConfirmed[0]).toEqual({ weekStart: '2026-07-27', count: 1 })
    expect(stats.weeklyConfirmed[11]).toEqual({ weekStart: '2026-10-12', count: 1 })
    expect(stats.weeklyConfirmed[10]).toEqual({ weekStart: '2026-10-05', count: 2 })
    expect(stats.weeklyConfirmed.reduce((sum, week) => sum + week.count, 0)).toBe(4)
  })

  it('counts only current subscribers by the form of their latest signup', () => {
    const stats = computeStats(
      [
        reader({ source: 'article-end' }),
        reader({ source: 'article-end' }),
        reader({ source: 'account' }),
        reader({ source: 'newsletters-page', status: 'pending' }),
        reader({ source: 'newsletters-page', status: 'unsubscribed' }),
      ],
      [],
      NOW,
    )
    expect(stats.bySource).toEqual({ 'homepage-block': 0, 'newsletters-page': 0, 'article-end': 2, account: 1 })
  })

  it('measures the confirm rate on signups whose 7-day link has expired, within 90 days', () => {
    const stats = computeStats(
      [
        reader({ signedUpAt: '2026-10-01T00:00:00.000Z', confirmedAt: '2026-10-01T00:05:00.000Z' }),
        reader({ status: 'pending', signedUpAt: '2026-10-02T00:00:00.000Z' }),
        reader({ status: 'bounced', signedUpAt: '2026-10-03T00:00:00.000Z' }),
        // Signed up 6 days ago: the link still works, too early to judge.
        reader({ status: 'pending', signedUpAt: '2026-10-08T12:00:00.000Z' }),
        // Older than 90 days.
        reader({ status: 'pending', signedUpAt: '2026-07-01T00:00:00.000Z' }),
        // A verified account holder confirmed in the same instant: no mail was sent.
        reader({ source: 'account', signedUpAt: '2026-10-01T00:00:00.000Z', confirmedAt: '2026-10-01T00:00:00.000Z' }),
        // Re-signed up after an old confirmation: the old click does not count for the new signup.
        reader({ status: 'pending', signedUpAt: '2026-10-04T00:00:00.000Z', confirmedAt: '2026-08-01T00:00:00.000Z' }),
      ],
      [],
      NOW,
    )
    expect(stats.confirmRate).toEqual({ signedUp: 4, confirmed: 1, since: '2026-07-16T12:00:00.000Z' })
  })

  it("gives each issue the unsubscribes and bounces from its send until the next issue's", () => {
    const issues = [
      issue({ subject: 'First', sentAt: '2026-09-01T10:00:00.000Z', items: [{ type: 'articles', id: 1 }] }),
      issue({ subject: 'Second', sentAt: '2026-10-01T10:00:00.000Z', recipients: 120, items: [{}, {}, {}] }),
    ]
    const confirmedAt = '2026-08-01T00:00:00.000Z'
    const stats = computeStats(
      [
        reader({ status: 'unsubscribed', confirmedAt, unsubscribedAt: '2026-09-01T10:00:00.000Z' }), // first, on the send instant
        reader({ status: 'unsubscribed', confirmedAt, unsubscribedAt: '2026-10-01T09:59:59.000Z' }), // first, just before the second
        reader({ status: 'unsubscribed', confirmedAt, unsubscribedAt: '2026-10-01T10:00:00.000Z' }), // second
        reader({ status: 'complained', confirmedAt, suppressedAt: '2026-10-02T00:00:00.000Z' }), // second
        reader({ status: 'bounced', confirmedAt, suppressedAt: '2026-08-15T00:00:00.000Z' }), // before any issue
        // Never confirmed: never received an issue.
        reader({ status: 'unsubscribed', unsubscribedAt: '2026-10-02T00:00:00.000Z' }),
        reader({ status: 'bounced', suppressedAt: '2026-10-02T00:00:00.000Z' }),
      ],
      issues,
      NOW,
    )
    expect(stats.issues).toEqual([
      { subject: 'Second', sentAt: '2026-10-01T10:00:00.000Z', recipients: 120, articleCount: 3, unsubscribedAfter: 1, suppressedAfter: 1 },
      { subject: 'First', sentAt: '2026-09-01T10:00:00.000Z', recipients: 100, articleCount: 1, unsubscribedAfter: 2, suppressedAfter: 0 },
    ])
  })

  it('keeps the newest twelve issues', () => {
    const many = Array.from({ length: 15 }, (_, index) =>
      issue({ subject: `#${index + 1}`, sentAt: new Date(Date.UTC(2026, 0, 1 + index * 7)).toISOString() }),
    )
    const stats = computeStats([], many, NOW)
    expect(stats.issues).toHaveLength(12)
    expect(stats.issues[0]!.subject).toBe('#15')
    expect(stats.issues[11]!.subject).toBe('#4')
  })
})
