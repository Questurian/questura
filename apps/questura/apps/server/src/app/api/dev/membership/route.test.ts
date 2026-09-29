import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NextRequest } from 'next/server'

/**
 * The switcher must be unreachable on live. Each refusal is tested on its own:
 * production mode, a database that is not on this machine, a page that is not
 * on localhost. The session lookup and the pool are stubbed; what is under
 * test is the route.
 */
const lookupVisitorSession = vi.fn()
const query = vi.fn()
const database = { uri: 'postgres://me@localhost:5432/questura' }

vi.mock('@/features/visitor-auth/lib/current-principal', () => ({
  lookupVisitorSession: (...args: unknown[]) => lookupVisitorSession(...args),
}))

vi.mock('@/features/visitor-auth/lib/better-auth', () => ({
  visitorAuthPool: { query: (...args: unknown[]) => query(...args) },
}))

vi.mock('@/shared/config', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/shared/config')>()
  return { ...original, APP_CONFIG: { ...original.APP_CONFIG, database } }
})

const { GET, POST } = await import('./route')

const LOCAL_ORIGIN = 'http://localhost:3000'
const SESSION_COOKIE = 'questura_visitor.session_token=x.y'

function request({ origin = LOCAL_ORIGIN, body }: { origin?: string | null; body?: unknown } = {}): NextRequest {
  const headers = new Headers({ cookie: SESSION_COOKIE })
  if (origin) headers.set('origin', origin)
  return { headers, signal: undefined, json: async () => body } as unknown as NextRequest
}

describe('/api/dev/membership', () => {
  beforeEach(() => {
    lookupVisitorSession.mockReset().mockResolvedValue({ user: { id: 'u1', email: 'me@example.com' } })
    query.mockReset().mockResolvedValue({ rowCount: 1, rows: [] })
    database.uri = 'postgres://me@localhost:5432/questura'
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does not exist in production mode', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    expect((await GET(request())).status).toBe(404)
    expect((await POST(request({ body: { state: 'member' } }))).status).toBe(404)
    expect(lookupVisitorSession).not.toHaveBeenCalled()
    expect(query).not.toHaveBeenCalled()
  })

  it('does not exist against a database that is not on this machine', async () => {
    database.uri = 'postgres://u@ep-x.us-east-1.aws.neon.tech/neondb'

    expect((await POST(request({ body: { state: 'member' } }))).status).toBe(404)
    expect(query).not.toHaveBeenCalled()
  })

  it('refuses a page that is not on localhost', async () => {
    expect((await POST(request({ origin: 'https://www.questurian.com', body: { state: 'member' } }))).status).toBe(403)
    expect((await POST(request({ origin: null, body: { state: 'member' } }))).status).toBe(403)
    expect(query).not.toHaveBeenCalled()
  })

  it('asks a signed-out caller to sign in', async () => {
    lookupVisitorSession.mockResolvedValue(null)

    expect((await POST(request({ body: { state: 'member' } }))).status).toBe(401)
    const read = await GET(request())
    expect(await read.json()).toMatchObject({ signedIn: false })
  })

  it('refuses a state it does not know', async () => {
    expect((await POST(request({ body: { state: 'admin' } }))).status).toBe(400)
    expect(query).not.toHaveBeenCalled()
  })

  it("writes the state onto the signed-in visitor's own profile", async () => {
    const response = await POST(request({ body: { state: 'grace' } }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ state: 'grace', active: true })
    const [sql, values] = query.mock.calls[0]
    expect(sql).toMatch(/update visitor_profiles/)
    expect(values[0]).toBe('u1')
    expect(values[1]).toBe('past_due')
  })

  it('says so when the visitor has no profile yet', async () => {
    query.mockResolvedValue({ rowCount: 0, rows: [] })

    expect((await POST(request({ body: { state: 'member' } }))).status).toBe(409)
  })
})
