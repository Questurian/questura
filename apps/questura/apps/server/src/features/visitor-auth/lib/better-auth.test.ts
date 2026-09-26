import { describe, expect, it, vi } from 'vitest'

// Read at import time by `shared/config`, so it has to be in place before the
// module under test loads.
vi.hoisted(() => {
  process.env.DATABASE_URI ||= 'postgres://test:test@127.0.0.1:1/test'
  process.env.NEXT_PUBLIC_APP_URL = 'https://www.questurian.com'
})

// Nothing here opens Payload, sends mail or touches Stripe; the config object
// is all this test reads.
vi.mock('@/payload.config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))
vi.mock('@/emails', () => ({
  sendPasswordResetLinkEmail: vi.fn(),
  sendVisitorEmailVerificationLinkEmail: vi.fn(),
}))
vi.mock('@/payments/lib/customer-linkage', () => ({ syncStripeCustomerEmail: vi.fn() }))

import { visitorAuth } from './better-auth'

describe('Visitor auth config', () => {
  // A Google callback whose state is gone (cookie expired, back button, link
  // opened in another browser) has no per-request error URL. It used to fall
  // back to Better Auth's `/error` on the API host and land on the API root.
  it('sends an OAuth error it cannot place to the site, not the API host', () => {
    expect(visitorAuth.options.onAPIError?.errorURL).toBe('https://www.questurian.com/auth-error')
  })
})
