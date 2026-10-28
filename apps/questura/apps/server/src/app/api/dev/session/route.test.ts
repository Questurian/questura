import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NextRequest } from 'next/server'

/**
 * Auto sign-in must be unreachable on live, like every `/api/dev/*` route.
 * Better Auth, the pool, the profile write and the saved-login file are
 * stubbed; what is under test is the route.
 */
const signInEmail = vi.fn()
const query = vi.fn()
const createUser = vi.fn()
const linkAccount = vi.fn()
const ensureProfile = vi.fn()
const readOrCreateDevLogin = vi.fn()
const database = { uri: 'postgres://me@localhost:5432/questura' }

vi.mock('@/features/visitor-auth/lib/better-auth', () => ({
  visitorAuth: {
    api: { signInEmail: (...args: unknown[]) => signInEmail(...args) },
    $context: Promise.resolve({
      password: { hash: async (password: string) => `hashed:${password}` },
      internalAdapter: { createUser: (...args: unknown[]) => createUser(...args), linkAccount: (...args: unknown[]) => linkAccount(...args) },
    }),
  },
  visitorAuthPool: { query: (...args: unknown[]) => query(...args) },
}))

vi.mock('@/features/visitor-auth/lib/visitor-profile', () => ({
  ensureVisitorProfileForAuthUser: (...args: unknown[]) => ensureProfile(...args),
}))

vi.mock('@/features/dev-tools/dev-login', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/features/dev-tools/dev-login')>()
  return { ...original, readOrCreateDevLogin: (...args: unknown[]) => readOrCreateDevLogin(...args) }
})

vi.mock('@/shared/config', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/shared/config')>()
  return { ...original, APP_CONFIG: { ...original.APP_CONFIG, database } }
})

const { POST } = await import('./route')

const LOGIN = { email: 'dev-reader-abc123@example.com', password: 'Dev-secret-9A!' }
const SESSION_COOKIE = 'questura_visitor.session_token=t.s; Path=/; HttpOnly; SameSite=Lax'

function request(origin: string | null = 'http://localhost:3000'): NextRequest {
  const headers = new Headers()
  if (origin) headers.set('origin', origin)
  return { headers, signal: undefined } as unknown as NextRequest
}

/** `select id ... where email` finds the user unless told otherwise; the profile read finds no row. */
function usersExist(...answers: boolean[]) {
  query.mockImplementation(async (text: string) => {
    if (text.includes('visitor_auth_users')) return { rowCount: 1, rows: answers.shift() === false ? [] : [{ id: 'u1' }] }
    return { rowCount: 0, rows: [] }
  })
}

describe('/api/dev/session', () => {
  beforeEach(() => {
    database.uri = 'postgres://me@localhost:5432/questura'
    readOrCreateDevLogin.mockReset().mockResolvedValue({ login: LOGIN, created: false })
    signInEmail.mockReset().mockResolvedValue(new Response('{}', { status: 200, headers: { 'Set-Cookie': SESSION_COOKIE } }))
    createUser.mockReset().mockResolvedValue({ id: 'u1', email: LOGIN.email, name: 'Dev Reader' })
    linkAccount.mockReset()
    ensureProfile.mockReset()
    usersExist()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does not exist in production mode', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    expect((await POST(request())).status).toBe(404)
    expect(readOrCreateDevLogin).not.toHaveBeenCalled()
    expect(signInEmail).not.toHaveBeenCalled()
  })

  it('does not exist against a database that is not on this machine', async () => {
    database.uri = 'postgres://u@ep-x.us-east-1.aws.neon.tech/neondb'

    expect((await POST(request())).status).toBe(404)
    expect(signInEmail).not.toHaveBeenCalled()
  })

  it('refuses a page that is not on localhost', async () => {
    expect((await POST(request('https://www.questurian.com'))).status).toBe(403)
    expect((await POST(request(null))).status).toBe(403)
    expect(signInEmail).not.toHaveBeenCalled()
  })

  it('signs the saved login in and passes on the session cookie', async () => {
    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ email: LOGIN.email, state: 'none', active: false })
    expect(response.headers.getSetCookie()).toEqual([SESSION_COOKIE])
    expect(signInEmail).toHaveBeenCalledWith(expect.objectContaining({ body: LOGIN, asResponse: true }))
    expect(createUser).not.toHaveBeenCalled()
  })

  it('creates the account on first use without going through sign-up (no email sent)', async () => {
    readOrCreateDevLogin.mockResolvedValue({ login: LOGIN, created: true })
    usersExist(false)

    expect((await POST(request())).status).toBe(200)
    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({ email: LOGIN.email, emailVerified: true }))
    expect(linkAccount).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', providerId: 'credential', password: `hashed:${LOGIN.password}` }))
    expect(ensureProfile).toHaveBeenCalled()
  })

  it('says which email is missing when the saved file names no local account', async () => {
    usersExist(false)

    const response = await POST(request())
    expect(response.status).toBe(409)
    expect((await response.json()).error).toContain(LOGIN.email)
    expect(createUser).not.toHaveBeenCalled()
    expect(signInEmail).not.toHaveBeenCalled()
  })

  it('says the saved password is wrong, and sets no cookie', async () => {
    signInEmail.mockResolvedValue(new Response(JSON.stringify({ message: 'Invalid email or password' }), { status: 401 }))

    const response = await POST(request())
    expect(response.status).toBe(409)
    expect((await response.json()).error).toContain('password in apps/server/.dev-login.json')
    expect(response.headers.getSetCookie()).toEqual([])
  })

  it('answers a broken saved file with its own message', async () => {
    const { DevLoginError } = await import('@/features/dev-tools/dev-login')
    readOrCreateDevLogin.mockRejectedValue(new DevLoginError('.dev-login.json is not valid JSON.'))

    const response = await POST(request())
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: '.dev-login.json is not valid JSON.' })
  })
})
