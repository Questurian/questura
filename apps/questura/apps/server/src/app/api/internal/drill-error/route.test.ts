import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NextRequest } from 'next/server'

const loggerError = vi.fn()
vi.mock('@/shared/utils/logger', () => ({ logger: { error: loggerError, warn: vi.fn(), info: vi.fn() } }))

const { POST } = await import('./route')

function request(kind: string | null, headers: Record<string, string> = {}): NextRequest {
  const url = new URL('https://api.example.test/api/internal/drill-error')
  if (kind) url.searchParams.set('kind', kind)
  return { headers: new Headers(headers), nextUrl: url } as unknown as NextRequest
}

const auth = { authorization: 'Bearer a-secret' }

beforeEach(() => {
  loggerError.mockReset()
  vi.stubEnv('DB_STATS_SECRET', 'a-secret')
})

afterEach(() => vi.unstubAllEnvs())

describe('POST /api/internal/drill-error', () => {
  it('refuses without the secret, and neither throws nor logs', async () => {
    const res = await POST(request('thrown'))
    expect(res.status).toBe(401)
    expect(loggerError).not.toHaveBeenCalled()
  })

  it('refuses a wrong secret', async () => {
    const res = await POST(request('logged', { authorization: 'Bearer wrong' }))
    expect(res.status).toBe(401)
    expect(loggerError).not.toHaveBeenCalled()
  })

  it('is closed when the ops secret is not configured', async () => {
    vi.stubEnv('DB_STATS_SECRET', '')
    const res = await POST(request('thrown', auth))
    expect(res.status).toBe(503)
  })

  it('thrown: lets a DRILL error escape the route, for onRequestError to report', async () => {
    await expect(POST(request('thrown', auth))).rejects.toThrow(/^DRILL: forced API error/)
    expect(loggerError).not.toHaveBeenCalled()
  })

  it('logged: logs the DRILL error with the Error itself (so it is captured with a stack) and answers 500', async () => {
    const res = await POST(request('logged', auth))
    expect(res.status).toBe(500)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(loggerError).toHaveBeenCalledTimes(1)
    const [message, data] = loggerError.mock.calls[0]
    expect(message).toMatch(/^DRILL/)
    expect(data.error).toBeInstanceOf(Error)
  })

  it('refuses an unknown kind without logging', async () => {
    const res = await POST(request('boom', auth))
    expect(res.status).toBe(400)
    expect(loggerError).not.toHaveBeenCalled()
  })

  it('accepts the x-stats-secret header too', async () => {
    const res = await POST(request('logged', { 'x-stats-secret': 'a-secret' }))
    expect(res.status).toBe(500)
  })
})
