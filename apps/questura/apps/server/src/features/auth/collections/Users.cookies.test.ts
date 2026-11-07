import { describe, expect, it } from 'vitest'
import { APP_CONFIG } from '@/shared/config'
import { STAFF_SESSION_SECONDS, Users } from './Users'

// The whole point of the session-cookie config is the `Domain` Payload puts on
// `payload-token`. Everything else here can be right while this one wiring is
// missing, and the symptom is a cookie that silently stays host-only.
describe('staff session cookie wiring', () => {
  it('hands the resolved cookie config to Payload auth', () => {
    expect(Users.auth).toMatchObject({ cookies: APP_CONFIG.sessionCookie })
  })

  it('keeps staff signed in instead of Payload’s 2-hour default', () => {
    expect(Users.auth).toMatchObject({ tokenExpiration: STAFF_SESSION_SECONDS })
    expect(STAFF_SESSION_SECONDS).toBeGreaterThanOrEqual(400 * 24 * 60 * 60)
  })

  it('keeps the cookie same-site rather than cross-site', () => {
    expect(APP_CONFIG.sessionCookie.sameSite).toBe('Lax')
  })
})
