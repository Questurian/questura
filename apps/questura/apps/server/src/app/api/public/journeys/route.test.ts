import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const query = vi.fn()
const session = vi.fn()
vi.mock('payload', async (original) => ({
  ...(await original<typeof import('payload')>()),
  getPayload: async () => ({ db: { pool: { query } } }),
}))
vi.mock('@/payload.config', () => ({ default: {} }))
vi.mock('@/features/visitor-auth/lib/current-principal', () => ({ lookupVisitorSession: session }))

import { resetLocalCounters } from '@/shared/lib/rate-limit-counter'

const { MAX_PER_ADDRESS, POST } = await import('./route')

const ID = '7f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f'
const REPORT = { viewerId: ID, visitId: ID, viewId: ID, seq: 1, path: '/', seconds: 4, scroll: 8, events: [] }
const IP = '192.0.2.77'
const UA = 'Mozilla/5.0 (Linux; Android 16; Pixel 9) Chrome/141.0 Mobile Safari/537.36'

function send(extra: Record<string, string> = {}, body: unknown = REPORT) {
  const headers = new Headers({ origin: 'http://localhost:3000', 'user-agent': UA, 'x-forwarded-for': IP, ...extra })
  return POST({ headers, text: async () => JSON.stringify(body) } as unknown as NextRequest)
}

beforeEach(() => {
  resetLocalCounters()
  query.mockReset().mockResolvedValue({ rowCount: 1 })
  session.mockReset().mockResolvedValue(null)
})
afterEach(() => vi.restoreAllMocks())

describe('POST /api/public/journeys', () => {
  it('stores a view without the address or the user agent', async () => {
    expect((await send()).status).toBe(204)
    expect(query).toHaveBeenCalledOnce()
    const values = JSON.stringify(query.mock.calls[0][1])
    expect(values).not.toContain(IP)
    expect(values).not.toContain('Mozilla')
  })

  it.each([
    ['Global Privacy Control', { 'sec-gpc': '1' }],
    ['Do Not Track', { dnt: '1' }],
    ['a reader outside the US', { 'cf-ipcountry': 'BR' }],
    ['a robot', { 'user-agent': 'Googlebot/2.1' }],
    ['staff', { cookie: 'payload-token=abc' }],
  ])('records nothing for %s', async (_name, headers) => {
    expect((await send(headers as unknown as Record<string, string>)).status).toBe(204)
    expect(query).not.toHaveBeenCalled()
  })

  it('refuses another site', async () => {
    expect((await send({ origin: 'https://evil.example' })).status).toBe(403)
    expect(query).not.toHaveBeenCalled()
  })

  it('links the account from the session, never from the body', async () => {
    await send({}, { ...REPORT, authUserId: 'forged' })
    expect(query.mock.calls[0][1][1]).toBeNull()

    session.mockResolvedValue({ user: { id: 'real-user' } })
    await send({ cookie: 'questura_visitor.session_token=t.sig' })
    expect(query.mock.calls[1][1][1]).toBe('real-user')
  })

  it('deletes even with a privacy signal on or from outside the US', async () => {
    expect((await send({ 'sec-gpc': '1', 'cf-ipcountry': 'BR' }, { forget: ID })).status).toBe(204)
    expect(query).toHaveBeenCalledWith('DELETE FROM journey_viewers WHERE id = $1', [ID])
  })

  it('says so when a deletion fails, and stays quiet when a report does', async () => {
    query.mockRejectedValue(Object.assign(new Error('down'), { code: '57P01' }))
    expect((await send({}, { forget: ID })).status).toBe(503)
    expect((await send()).status).toBe(204)
  })

  it('stops writing past the limit, without blocking a deletion', async () => {
    for (let i = 0; i < MAX_PER_ADDRESS + 2; i += 1) await send()
    expect(query).toHaveBeenCalledTimes(MAX_PER_ADDRESS)
    expect((await send({}, { forget: ID })).status).toBe(204)
    expect(query).toHaveBeenCalledTimes(MAX_PER_ADDRESS + 1)
  })
})
