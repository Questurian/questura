import { describe, expect, it } from 'vitest'

import { isForeignSameSiteOrigin, siteOf } from './same-site-origin'

const LIVE = {
  allowedOrigins: ['https://www.questurian.com', 'https://questurian.com'],
  selfOrigin: 'https://api.questurian.com',
  host: 'api.questurian.com',
}

const refused = (method: string, origin: string | null, overrides: Partial<typeof LIVE> = {}) =>
  isForeignSameSiteOrigin({ ...LIVE, ...overrides, method, origin })

describe('same-site foreign origin', () => {
  it('refuses a write from the ad frame origin', () => {
    expect(refused('POST', 'https://ads.questurian.com')).toBe(true)
    expect(refused('DELETE', 'https://ads.questurian.com')).toBe(true)
    expect(refused('PATCH', 'https://anything.questurian.com')).toBe(true)
  })

  it('lets the site, the admin and servers through', () => {
    expect(refused('POST', 'https://www.questurian.com')).toBe(false)
    expect(refused('POST', 'https://questurian.com')).toBe(false)
    // The Payload admin posts to its own origin.
    expect(refused('POST', 'https://api.questurian.com')).toBe(false)
    expect(refused('POST', 'https://api.questurian.com', { host: 'questura-server.up.railway.app' })).toBe(false)
    // Stripe, Resend and other servers send no Origin.
    expect(refused('POST', null)).toBe(false)
  })

  it('leaves reads alone, even from the ad origin', () => {
    expect(refused('GET', 'https://ads.questurian.com')).toBe(false)
    expect(refused('HEAD', 'https://ads.questurian.com')).toBe(false)
    expect(refused('OPTIONS', 'https://ads.questurian.com')).toBe(false)
  })

  it('leaves other sites to the SameSite=Lax cookie', () => {
    expect(refused('POST', 'https://evil.example')).toBe(false)
    expect(refused('POST', 'http://localhost:3003')).toBe(false)
    expect(refused('POST', 'null')).toBe(false)
  })

  it('works the same in development', () => {
    const dev = {
      allowedOrigins: ['http://localhost:3000', 'http://localhost:3003'],
      selfOrigin: 'http://localhost:4000',
      host: 'localhost:4000',
    }
    expect(refused('POST', 'http://localhost:3000', dev)).toBe(false)
    expect(refused('POST', 'http://localhost:4000', dev)).toBe(false)
    expect(refused('POST', 'https://ads.questurian.com', dev)).toBe(false)
  })

  it('names the site by its last two labels', () => {
    expect(siteOf('ads.questurian.com')).toBe('questurian.com')
    expect(siteOf('QUESTURIAN.COM.')).toBe('questurian.com')
    expect(siteOf('localhost')).toBe('localhost')
    expect(siteOf('127.0.0.1')).toBe('127.0.0.1')
  })
})
