// @vitest-environment node
/**
 * The buyer's passwordless sign-up, attacked through Better Auth's own router
 * with the site's real options as production builds them (bot check on,
 * secure cookies). Only the store, the mail and Cloudflare's answer are fakes.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  process.env.DATABASE_URI ||= 'postgres://test:test@127.0.0.1:1/test'
  process.env.NEXT_PUBLIC_APP_URL = 'https://www.questurian.com'
  return {
    ensureProfile: vi.fn(),
    verification: vi.fn(),
    reset: vi.fn(),
    isStaff: vi.fn(),
  }
})

vi.mock('@/shared/config', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/shared/config')>()
  return {
    ...real,
    APP_URLS: {
      ...real.APP_URLS,
      backend: 'https://api.questurian.com',
      frontendUrl: (path: string) => `https://www.questurian.com${path}`,
    },
    APP_CONFIG: {
      ...real.APP_CONFIG,
      isProduction: true,
      payloadSecret: 'checkout-sign-up-test-secret-0000000000000000',
      CORS_ORIGINS: ['https://www.questurian.com'],
      redis: { ...real.APP_CONFIG.redis, url: 'redis://127.0.0.1:1' },
      turnstile: { ...real.APP_CONFIG.turnstile, enabled: true, secretKey: 'test-secret' },
    },
  }
})
vi.mock('./redis-secondary-storage', () => ({ redisSecondaryStorage: undefined }))
vi.mock('./session-revocations', () => ({
  SESSION_COOKIE_CACHE_SECONDS: 300,
  sessionRevocations: { record: vi.fn() },
}))
vi.mock('./visitor-profile', () => ({
  ensureVisitorProfileForAuthUser: mocks.ensureProfile,
  findVisitorProfileByAuthUserId: vi.fn(),
  updateVisitorProfileByAuthUserId: vi.fn(),
  splitDisplayName: () => ({ firstName: '', lastName: '' }),
}))
vi.mock('./staff-email-guard', () => ({ isStaffEmail: mocks.isStaff }))
vi.mock('./security-audit', () => ({ auditVisitorAuthSecurityEvent: vi.fn() }))
vi.mock('@/payload.config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))
vi.mock('@/emails', () => ({
  sendPasswordResetLinkEmail: mocks.reset,
  sendVisitorEmailVerificationLinkEmail: mocks.verification,
}))
vi.mock('@/payments/lib/customer-linkage', () => ({ syncStripeCustomerEmail: vi.fn() }))

import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'

import { visitorAuth } from './better-auth'

const SITE = 'https://www.questurian.com'
const STRONG = 'Ceviche-2026!'
type Row = Record<string, unknown>

function world({ limit = false } = {}) {
  const db: Record<string, Row[]> = {
    visitor_auth_users: [],
    visitor_auth_sessions: [],
    visitor_auth_accounts: [],
    visitor_auth_verifications: [],
    visitor_auth_rate_limits: [],
  }
  const auth = betterAuth({
    ...visitorAuth.options,
    baseURL: 'https://api.questurian.com',
    database: memoryAdapter(db),
    secondaryStorage: undefined,
    rateLimit: { ...visitorAuth.options.rateLimit, enabled: limit, storage: 'memory' },
    // Better Auth skips its origin check when it sees a test runner.
    advanced: { ...visitorAuth.options.advanced, disableOriginCheck: false, disableCSRFCheck: false },
  })

  async function call(path: string, body: unknown, headers: Record<string, string | null> = {}) {
    const all: Record<string, string | null> = {
      'content-type': 'application/json',
      origin: SITE,
      'x-captcha-response': 'good',
      'x-questura-client-ip': '203.0.113.7',
      ...headers,
    }
    const sent = Object.fromEntries(Object.entries(all).filter((entry) => entry[1] !== null)) as Record<string, string>
    const response = await auth.handler(
      new Request(`https://api.questurian.com/api/visitor-auth${path}`, {
        method: 'POST',
        headers: sent,
        body: JSON.stringify(body),
      }),
    )
    const cookie = response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ')
    return { status: response.status, cookie, setCookie: response.headers.getSetCookie(), text: await response.text() }
  }

  return {
    auth,
    call,
    buy: (email: unknown, headers?: Record<string, string | null>) => call('/sign-up/checkout', { email }, headers),
    // Getters: the memory store replaces these arrays when it commits.
    get users() {
      return db.visitor_auth_users
    },
    get sessions() {
      return db.visitor_auth_sessions
    },
    get accounts() {
      return db.visitor_auth_accounts
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.isStaff.mockResolvedValue(false)
  mocks.verification.mockResolvedValue({ success: true })
  mocks.reset.mockResolvedValue({ success: true })
  vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: { body?: unknown }) =>
    Response.json({ success: String(init?.body).includes('good') })))
})
afterAll(() => vi.unstubAllGlobals())

describe('checkout sign-up', () => {
  it('gives a new email an unverified account, a profile, a session and no password', async () => {
    const w = world()
    const result = await w.buy('Buyer@Example.com')

    expect(result.status).toBe(200)
    expect(w.users).toMatchObject([{ email: 'buyer@example.com', emailVerified: false }])
    expect(w.accounts).toHaveLength(0)
    expect(w.sessions).toHaveLength(1)
    expect(mocks.ensureProfile).toHaveBeenCalledWith(expect.objectContaining({ id: w.users[0].id, email: 'buyer@example.com' }))
    const session = await w.auth.api.getSession({ headers: new Headers({ cookie: result.cookie }) })
    expect(session?.user.id).toBe(w.users[0].id)
  })

  it('never puts the session token in the body, and the cookie is HttpOnly and Secure', async () => {
    const w = world()
    const result = await w.buy('buyer@example.com')

    expect(result.text).not.toContain(String(w.sessions[0].token))
    expect(result.setCookie.join('\n')).toMatch(/session_token=[^\n]*HttpOnly/i)
    expect(result.setCookie.join('\n')).toMatch(/session_token=[^\n]*Secure/i)
  })

  it('mails the verification link, landing on the site and nowhere else', async () => {
    const w = world()
    await w.call('/sign-up/checkout', { email: 'buyer@example.com', callbackURL: `${SITE}/other` })

    const { url } = mocks.verification.mock.calls[0][1]
    expect(new URL(url).searchParams.get('callbackURL')).toBe(`${SITE}/`)
  })

  describe('someone typing another person’s email', () => {
    it.each(['victim@example.com', 'VICTIM@example.com', '  Victim@Example.com  '])(
      'gets no session on a password account (%j)',
      async (typed) => {
        const w = world()
        expect((await w.call('/sign-up/email', { email: 'victim@example.com', password: STRONG, name: '' })).status).toBe(200)

        const attack = await w.buy(typed)

        expect(attack.status).toBe(422)
        expect(attack.cookie).not.toContain('session_token')
        expect(w.sessions).toHaveLength(1)
        expect(w.users).toHaveLength(1)
      },
    )

    it('gets no session on an account that has no password yet', async () => {
      const w = world()
      await w.buy('victim@example.com')

      const attack = await w.buy('victim@example.com')

      expect(attack.status).toBe(422)
      expect(attack.cookie).not.toContain('session_token')
      expect(w.sessions).toHaveLength(1)
    })

    it('gets no session on a Google-only account', async () => {
      const w = world()
      const { internalAdapter } = await w.auth.$context
      const user = await internalAdapter.createUser({ email: 'victim@example.com', name: '', emailVerified: true }, { method: 'oauth' })
      await internalAdapter.linkAccount({ userId: user.id, providerId: 'google', accountId: 'google-1' })

      expect((await w.buy('victim@example.com')).status).toBe(422)
      expect(w.sessions).toHaveLength(0)
    })

    it('cannot sign in to a passwordless account with any password', async () => {
      const w = world()
      await w.buy('victim@example.com')

      for (const password of ['', ' ', STRONG]) {
        const attack = await w.call('/sign-in/email', { email: 'victim@example.com', password })
        expect(attack.status).toBeGreaterThanOrEqual(400)
      }
      expect(w.sessions).toHaveLength(1)
    })

    it('who got there first is thrown out when the owner uses the reset link', async () => {
      const w = world()
      await w.buy('victim@example.com')
      expect((await w.call('/request-password-reset', { email: 'victim@example.com' })).status).toBe(200)
      const token = new URL(mocks.reset.mock.calls[0][1].url).pathname.split('/').pop()

      expect((await w.call('/reset-password', { token, newPassword: STRONG })).status).toBe(200)

      expect(w.sessions).toHaveLength(0)
      expect((await w.call('/sign-in/email', { email: 'victim@example.com', password: STRONG })).status).toBe(200)
    })
  })

  it('makes one account and one session from simultaneous submits', async () => {
    const w = world()
    const { internalAdapter } = await w.auth.$context
    const create = internalAdapter.createUser.bind(internalAdapter)
    let created = false
    // The memory store has no unique index; stand in for Postgres's.
    vi.spyOn(internalAdapter, 'createUser').mockImplementation(async (...args) => {
      if (created) {
        await new Promise((resolve) => setTimeout(resolve, 5))
        throw new Error('duplicate key value violates unique constraint')
      }
      created = true
      return create(...args)
    })

    const results = await Promise.all(Array.from({ length: 5 }, () => w.buy('race@example.com')))

    expect(results.map((result) => result.status).sort()).toEqual([200, 422, 422, 422, 422])
    expect(w.users).toHaveLength(1)
    expect(w.sessions).toHaveLength(1)
  })

  it('still lets the buyer pay when the verification mail cannot be sent', async () => {
    const w = world()
    mocks.verification.mockResolvedValue({ success: false, error: 'Resend is down' })

    const result = await w.buy('buyer@example.com')

    expect(result.status).toBe(200)
    expect(result.cookie).toContain('session_token')
  })

  it('refuses a staff email', async () => {
    const w = world()
    mocks.isStaff.mockResolvedValue(true)

    expect((await w.buy('editor@example.com')).status).toBe(403)
    expect(w.users).toHaveLength(0)
  })

  it.each([
    ['no token', null],
    ['a bad token', 'forged'],
  ])('refuses %s from the bot check', async (_name, token) => {
    const w = world()

    expect((await w.buy('bot@example.com', { 'x-captcha-response': token })).status).toBeGreaterThanOrEqual(400)
    expect(w.users).toHaveLength(0)
  })

  it.each(['/sign-up/checkout/', '//sign-up/checkout'])('has no path that skips the bot check (%s)', async (path) => {
    const w = world()
    await w.call(path, { email: 'bot@example.com' }, { 'x-captcha-response': null })

    expect(w.users).toHaveLength(0)
  })

  it('refuses another site’s form, with or without a cookie', async () => {
    const w = world()
    const foreign = { origin: 'https://evil.example' }
    const crossSite = { 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document' }

    expect((await w.buy('a@example.com', { ...foreign, cookie: 'anything=1' })).status).toBe(403)
    expect((await w.buy('b@example.com', { ...foreign, ...crossSite })).status).toBe(403)
    expect(w.users).toHaveLength(0)
  })

  it.each([
    ['nothing', undefined],
    ['not an address', 'not-an-email'],
    ['a list', ['a@example.com', 'b@example.com']],
    ['an object', { contains: '@' }],
    ['a header injection', 'a@example.com\r\nBcc: b@example.com'],
    ['a very long one', `${'a'.repeat(260)}@example.com`],
  ])('refuses %s as the email', async (_name, email) => {
    const w = world()

    expect((await w.buy(email)).status).toBe(400)
    expect(w.users).toHaveLength(0)
  })

  it('takes no other field from the caller', async () => {
    const w = world()
    await w.call('/sign-up/checkout', { email: 'x@example.com', emailVerified: true, id: 'chosen', name: 'Injected', password: 'x' })

    expect(w.users).toMatchObject([{ emailVerified: false, name: '' }])
    expect(w.users[0].id).not.toBe('chosen')
    expect(w.accounts).toHaveLength(0)
  })

  it('stops one address after five tries a minute', async () => {
    const w = world({ limit: true })
    const statuses: number[] = []
    for (let i = 0; i < 7; i += 1) statuses.push((await w.buy(`spray-${i}@example.com`)).status)

    expect(statuses).toEqual([200, 200, 200, 200, 200, 429, 429])
  })

  it('lets the buyer set a password once, never overwrite it', async () => {
    const w = world()
    const { cookie } = await w.buy('buyer@example.com')
    const headers = new Headers({ cookie })

    await w.auth.api.setPassword({ body: { newPassword: STRONG }, headers })

    await expect(w.auth.api.setPassword({ body: { newPassword: 'Replaced-2026!' }, headers })).rejects.toThrow()
    expect((await w.call('/sign-in/email', { email: 'buyer@example.com', password: STRONG })).status).toBe(200)
  })
})
