import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  sendConfirmation: vi.fn(),
  emailLimit: vi.fn(),
  dailyLimit: vi.fn(),
}))

vi.mock('payload', () => ({
  getPayload: vi.fn().mockResolvedValue({
    find: mocks.find,
    create: mocks.create,
    update: mocks.update,
  }),
}))
vi.mock('@/payload.config', () => ({ default: {} }))
vi.mock('@/features/emails', () => ({ sendNewsletterConfirmationEmail: mocks.sendConfirmation }))
vi.mock('./rate-limit', () => ({
  checkConfirmationEmailLimit: mocks.emailLimit,
  checkDailyConfirmationLimit: mocks.dailyLimit,
}))

import { confirm, isWellFormedConfirmToken, subscribe } from './service'

const NOW = new Date('2026-10-13T12:00:00.000Z')
const headers = new Headers()
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

function rows(...docs: Record<string, unknown>[]) {
  return { docs }
}

function mailedToken(): string {
  const { url } = mocks.sendConfirmation.mock.calls[0]![1] as { url: string }
  return new URL(url).searchParams.get('token')!
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.find.mockResolvedValue(rows())
  mocks.emailLimit.mockResolvedValue({ allowed: true })
  mocks.dailyLimit.mockResolvedValue({ allowed: true })
  mocks.sendConfirmation.mockResolvedValue({ success: true })
})

describe('subscribe', () => {
  it('stores a new address as pending and mails a link whose token only the hash of is kept', async () => {
    const result = await subscribe({ email: 'reader@example.com', source: 'homepage-block', headers, now: NOW })

    expect(result).toEqual({ outcome: 'confirmation-sent' })
    const { data } = mocks.create.mock.calls[0]![0]
    expect(data).toMatchObject({
      email: 'reader@example.com',
      status: 'pending',
      source: 'homepage-block',
      signedUpAt: NOW.toISOString(),
      confirmTokenExpiresAt: '2026-10-20T12:00:00.000Z',
    })

    const token = mailedToken()
    expect(isWellFormedConfirmToken(token)).toBe(true)
    expect(data.confirmTokenHash).toBe(sha256(token))
    expect(JSON.stringify(data)).not.toContain(token)
    expect(mocks.sendConfirmation.mock.calls[0]![1].url).toMatch(/\/newsletters\/confirm\?token=/)
  })

  it.each(['subscribed', 'bounced', 'complained'])('mails nothing to a %s address and writes nothing', async (status) => {
    mocks.find.mockResolvedValue(rows({ id: 1, email: 'reader@example.com', status }))

    const result = await subscribe({ email: 'reader@example.com', source: 'article-end', headers, now: NOW })

    expect(result).toEqual({ outcome: 'nothing-to-send' })
    expect(mocks.sendConfirmation).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    // Not even counted against the inbox: nothing was going to be sent.
    expect(mocks.emailLimit).not.toHaveBeenCalled()
  })

  it('puts an unsubscribed address back to pending with a new consent time, not straight to subscribed', async () => {
    mocks.find.mockResolvedValue(rows({ id: 7, email: 'reader@example.com', status: 'unsubscribed' }))

    await subscribe({ email: 'reader@example.com', source: 'newsletters-page', headers, now: NOW })

    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 7,
        data: expect.objectContaining({ status: 'pending', source: 'newsletters-page', signedUpAt: NOW.toISOString() }),
      }),
    )
    expect(mocks.sendConfirmation).toHaveBeenCalledOnce()
  })

  it('answers like a success, without mailing, once an inbox has had its confirmations', async () => {
    mocks.emailLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 100 })

    const result = await subscribe({ email: 'reader@example.com', source: 'homepage-block', headers, now: NOW })

    expect(result).toEqual({ outcome: 'nothing-to-send' })
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.sendConfirmation).not.toHaveBeenCalled()
  })

  it('is busy, without writing or mailing, once the daily confirmation budget is spent', async () => {
    mocks.dailyLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 3600 })

    const result = await subscribe({ email: 'reader@example.com', source: 'homepage-block', headers, now: NOW })

    expect(result).toMatchObject({ outcome: 'busy', retryAfterSeconds: 3600 })
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.sendConfirmation).not.toHaveBeenCalled()
  })

  it('reports a failed send', async () => {
    mocks.sendConfirmation.mockResolvedValue({ success: false, error: 'resend down' })

    const result = await subscribe({ email: 'reader@example.com', source: 'homepage-block', headers, now: NOW })

    expect(result).toEqual({ outcome: 'send-failed' })
  })

  it('updates the row a concurrent signup created instead of failing', async () => {
    mocks.find
      .mockResolvedValueOnce(rows())
      .mockResolvedValueOnce(rows({ id: 3, email: 'reader@example.com', status: 'pending' }))
    mocks.create.mockRejectedValue(new Error('duplicate key value violates unique constraint'))

    const result = await subscribe({ email: 'reader@example.com', source: 'homepage-block', headers, now: NOW })

    expect(result).toEqual({ outcome: 'confirmation-sent' })
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }))
  })
})

describe('confirm', () => {
  const token = 'a'.repeat(43)
  const live = '2026-10-14T00:00:00.000Z'

  it('subscribes a pending row whose link is still live', async () => {
    mocks.find.mockResolvedValue(rows({ id: 1, status: 'pending', confirmTokenExpiresAt: live }))

    expect(await confirm(token, NOW)).toBe('confirmed')
    expect(mocks.find.mock.calls[0]![0].where).toEqual({ confirmTokenHash: { equals: sha256(token) } })
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, data: { status: 'subscribed', confirmedAt: NOW.toISOString() } }),
    )
  })

  it('reads a repeat click as confirmed and writes nothing', async () => {
    mocks.find.mockResolvedValue(rows({ id: 1, status: 'subscribed', confirmTokenExpiresAt: live }))

    expect(await confirm(token, NOW)).toBe('confirmed')
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('refuses an expired link', async () => {
    mocks.find.mockResolvedValue(rows({ id: 1, status: 'pending', confirmTokenExpiresAt: '2026-10-13T11:59:59.000Z' }))

    expect(await confirm(token, NOW)).toBe('expired')
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it.each(['unsubscribed', 'bounced', 'complained'])('never lets an old link undo %s', async (status) => {
    mocks.find.mockResolvedValue(rows({ id: 1, status, confirmTokenExpiresAt: live }))

    expect(await confirm(token, NOW)).toBe('invalid')
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('refuses an unknown token', async () => {
    expect(await confirm(token, NOW)).toBe('invalid')
  })
})

describe('isWellFormedConfirmToken', () => {
  it.each([undefined, 42, '', 'short', 'a'.repeat(44), `${'a'.repeat(42)}=`, `${'a'.repeat(42)}/`])(
    'refuses %s',
    (value) => {
      expect(isWellFormedConfirmToken(value)).toBe(false)
    },
  )
})
