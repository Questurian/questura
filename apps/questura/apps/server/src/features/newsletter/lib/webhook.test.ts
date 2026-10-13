import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ unsubscribe: vi.fn(), suppress: vi.fn() }))
vi.mock('./service', () => ({ unsubscribe: mocks.unsubscribe, suppress: mocks.suppress }))

import { handleResendEvent, verifyResendWebhook } from './webhook'

const SECRET = `whsec_${Buffer.from('a-test-signing-secret-32-bytes!!').toString('base64')}`
const NOW = 1_760_000_000
const BODY = '{"type":"contact.updated","data":{"email":"reader@example.com","unsubscribed":true}}'

function sign(body: string, id = 'msg_1', timestamp = String(NOW), secret = SECRET) {
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  return `v1,${createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')}`
}

describe('verifyResendWebhook', () => {
  it('accepts a body signed with the secret', () => {
    expect(verifyResendWebhook(SECRET, BODY, { id: 'msg_1', timestamp: String(NOW), signature: sign(BODY) }, NOW)).toBe(true)
  })

  it('accepts any one of several signatures, as during a secret rotation', () => {
    const signature = `v1,bm9wZQ== ${sign(BODY)}`
    expect(verifyResendWebhook(SECRET, BODY, { id: 'msg_1', timestamp: String(NOW), signature }, NOW)).toBe(true)
  })

  it('refuses a body changed after signing', () => {
    const signature = sign(BODY)
    expect(verifyResendWebhook(SECRET, BODY.replace('true', 'false'), { id: 'msg_1', timestamp: String(NOW), signature }, NOW)).toBe(false)
  })

  it('refuses another secret, a replayed old message, and missing headers', () => {
    const otherSecret = `whsec_${Buffer.from('another-secret-another-secret-32').toString('base64')}`
    expect(verifyResendWebhook(SECRET, BODY, { id: 'msg_1', timestamp: String(NOW), signature: sign(BODY, 'msg_1', String(NOW), otherSecret) }, NOW)).toBe(false)
    expect(verifyResendWebhook(SECRET, BODY, { id: 'msg_1', timestamp: String(NOW), signature: sign(BODY) }, NOW + 301)).toBe(false)
    expect(verifyResendWebhook(SECRET, BODY, { id: null, timestamp: String(NOW), signature: sign(BODY) }, NOW)).toBe(false)
    expect(verifyResendWebhook('', BODY, { id: 'msg_1', timestamp: String(NOW), signature: sign(BODY) }, NOW)).toBe(false)
  })
})

describe('handleResendEvent', () => {
  beforeEach(() => vi.clearAllMocks())

  it('turns an unsubscribe in Resend into an unsubscribe here, without echoing it back', async () => {
    await handleResendEvent({ type: 'contact.updated', data: { email: 'Reader@Example.com', unsubscribed: true } })
    expect(mocks.unsubscribe).toHaveBeenCalledWith('reader@example.com', 'resend')
  })

  it('never subscribes anyone from Resend: only double opt-in does that', async () => {
    await handleResendEvent({ type: 'contact.updated', data: { email: 'reader@example.com', unsubscribed: false } })
    expect(mocks.unsubscribe).not.toHaveBeenCalled()
    expect(mocks.suppress).not.toHaveBeenCalled()
  })

  it('suppresses on a permanent bounce only', async () => {
    await handleResendEvent({ type: 'email.bounced', data: { to: ['reader@example.com'], bounce: { type: 'Transient' } } })
    expect(mocks.suppress).not.toHaveBeenCalled()

    await handleResendEvent({ type: 'email.bounced', data: { to: ['reader@example.com'], bounce: { type: 'Permanent' } } })
    expect(mocks.suppress).toHaveBeenCalledWith('reader@example.com', 'bounced')
  })

  it('suppresses a spam complaint', async () => {
    await handleResendEvent({ type: 'email.complained', data: { to: ['reader@example.com'] } })
    expect(mocks.suppress).toHaveBeenCalledWith('reader@example.com', 'complained')
  })

  it('ignores events it does not use', async () => {
    await handleResendEvent({ type: 'email.opened', data: { to: ['reader@example.com'] } })
    expect(mocks.unsubscribe).not.toHaveBeenCalled()
    expect(mocks.suppress).not.toHaveBeenCalled()
  })
})
