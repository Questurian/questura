import { describe, expect, it } from 'vitest'

import nextConfig from '../../../next.config.mjs'

// The API and the Payload admin carry the same framing and sniffing guards as
// the site (launch harness D4). The admin is the one page here with buttons
// worth clickjacking.
describe('server security headers', () => {
  it('every route sends them', async () => {
    type Rule = { source: string; headers: Array<{ key: string; value: string }> }
    // `withPayload` adds its own catch-all rule beside ours; combine them.
    const rules = (await nextConfig.headers!()) as Rule[]
    const headers = Object.fromEntries(
      rules
        .filter((rule) => rule.source === '/:path*')
        .flatMap((rule) => rule.headers)
        .map(({ key, value }) => [key.toLowerCase(), value])
    )
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['content-security-policy']).toMatch(/frame-ancestors 'none'/)
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(Number(/max-age=(\d+)/.exec(headers['strict-transport-security'])?.[1])).toBeGreaterThanOrEqual(15_552_000)
  })

  // Launch fix plan item 8: `Critical-CH` made Chrome send the Google sign-in
  // callback twice, and the second copy failed on the spent OAuth state.
  it('asks for client hints on the admin only, never on the API', async () => {
    type Rule = { source: string; headers: Array<{ key: string; value: string }> }
    const rules = (await nextConfig.headers!()) as Rule[]
    const hintKeys = (rule: Rule) => rule.headers.map(({ key }) => key.toLowerCase()).filter((key) => key.endsWith('-ch'))
    expect(rules.filter((rule) => !rule.source.startsWith('/admin')).flatMap(hintKeys)).toEqual([])
    const admin = rules.filter((rule) => rule.source === '/admin/:path*').flatMap(hintKeys)
    expect(admin).toEqual(expect.arrayContaining(['accept-ch', 'critical-ch']))
  })

  // 2026-10-01 audit: the stack is nobody's business.
  it('does not advertise Next.js or Payload', async () => {
    type Rule = { source: string; headers: Array<{ key: string; value: string }> }
    const rules = (await nextConfig.headers!()) as Rule[]
    expect(rules.flatMap((rule) => rule.headers).some(({ key }) => key.toLowerCase() === 'x-powered-by')).toBe(false)
    expect(nextConfig.poweredByHeader).toBe(false)
  })
})
