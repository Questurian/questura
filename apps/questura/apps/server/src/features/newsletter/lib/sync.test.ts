import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  update: vi.fn(),
  list: vi.fn(),
  upsert: vi.fn(),
  unsubscribe: vi.fn(),
}))

vi.mock('payload', () => ({ getPayload: vi.fn().mockResolvedValue({ find: mocks.find, update: mocks.update }) }))
vi.mock('@/payload.config', () => ({ default: {} }))
vi.mock('./resend-api', () => ({
  listSegmentContacts: mocks.list,
  upsertContact: mocks.upsert,
  unsubscribeContact: mocks.unsubscribe,
}))

import { pushSubscriberState, reconcileBeforeSend } from './sync'

const NOW = new Date('2026-11-01T12:00:00.000Z')

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('RESEND_NEWSLETTER_API_KEY', 're_test')
  vi.stubEnv('RESEND_NEWSLETTER_SEGMENT_ID', 'seg_1')
})

describe('reconcileBeforeSend', () => {
  it('makes the segment exactly the confirmed rows', async () => {
    mocks.find.mockResolvedValue({
      docs: [
        { id: 1, email: 'missing@example.com', status: 'subscribed', confirmedAt: '2026-10-01T00:00:00Z' },
        { id: 2, email: 'there@example.com', status: 'subscribed', confirmedAt: '2026-10-01T00:00:00Z' },
        { id: 3, email: 'left@example.com', status: 'unsubscribed', confirmedAt: '2026-09-01T00:00:00Z' },
        { id: 4, email: 'pending@example.com', status: 'pending', confirmedAt: null },
      ],
    })
    mocks.list.mockResolvedValue([
      { id: 'c2', email: 'there@example.com', unsubscribed: false },
      { id: 'c3', email: 'left@example.com', unsubscribed: false },
      { id: 'c9', email: 'stranger@example.com', unsubscribed: false },
    ])

    const report = await reconcileBeforeSend(NOW)

    expect(mocks.upsert).toHaveBeenCalledOnce()
    expect(mocks.upsert).toHaveBeenCalledWith('re_test', 'seg_1', 'missing@example.com', false)
    expect(mocks.unsubscribe.mock.calls.map((call) => call[1]).sort()).toEqual(['left@example.com', 'stranger@example.com'])
    expect(report).toEqual({ pushed: 1, unsubscribedInResend: 2, pulledUnsubscribes: 0, recipients: 2 })
  })

  it('honours an unsubscribe made in Resend after the reader confirmed (a missed webhook)', async () => {
    mocks.find.mockResolvedValue({
      docs: [{ id: 1, email: 'reader@example.com', status: 'subscribed', confirmedAt: '2026-10-01T00:00:00Z' }],
    })
    mocks.list.mockResolvedValue([
      { id: 'c1', email: 'reader@example.com', unsubscribed: true, updated_at: '2026-10-20T00:00:00Z' },
    ])

    const report = await reconcileBeforeSend(NOW)

    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, data: { status: 'unsubscribed', unsubscribedAt: NOW.toISOString() } }),
    )
    expect(mocks.upsert).not.toHaveBeenCalled()
    expect(report.recipients).toBe(0)
  })

  it('resubscribes in Resend a reader who confirmed again after an old unsubscribe', async () => {
    mocks.find.mockResolvedValue({
      docs: [{ id: 1, email: 'reader@example.com', status: 'subscribed', confirmedAt: '2026-10-25T00:00:00Z' }],
    })
    mocks.list.mockResolvedValue([
      { id: 'c1', email: 'reader@example.com', unsubscribed: true, updated_at: '2026-06-01T00:00:00Z' },
    ])

    const report = await reconcileBeforeSend(NOW)

    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.upsert).toHaveBeenCalledWith('re_test', 'seg_1', 'reader@example.com', false)
    expect(report.recipients).toBe(1)
  })
})

describe('pushSubscriberState', () => {
  it('does nothing until Resend is configured', async () => {
    vi.stubEnv('RESEND_NEWSLETTER_API_KEY', '')
    await pushSubscriberState('reader@example.com', true)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it('never throws: a failed push is left for the next reconcile', async () => {
    mocks.upsert.mockRejectedValue(new Error('resend down'))
    await expect(pushSubscriberState('reader@example.com', true)).resolves.toBeUndefined()
  })
})
