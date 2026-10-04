import assert from 'node:assert/strict'
import test from 'node:test'

import { SECURITY_HEADERS, reportOnlyContentSecurityPolicy } from './securityHeaders.ts'

// Every page carries these (launch harness D4). Without them the site could
// be framed by another site and a signed-in reader tricked into clicking
// "Cancel subscription" (clickjacking), and a response could be sniffed as a
// different content type. `next.config.ts` applies them to `/:path*`.
test('the security headers say what they must', () => {
  const headers = Object.fromEntries(SECURITY_HEADERS.map(({ key, value }) => [key.toLowerCase(), value]))
  assert.equal(headers['x-frame-options'], 'DENY')
  assert.match(headers['content-security-policy'], /frame-ancestors 'none'/)
  assert.equal(headers['x-content-type-options'], 'nosniff')
  assert.equal(headers['referrer-policy'], 'strict-origin-when-cross-origin')
  assert.ok(Number(/max-age=(\d+)/.exec(headers['strict-transport-security'])[1]) >= 15_552_000)
})

// Report-only: browsers log what it would block and block nothing, so a gap
// costs a console line, not a broken page (2026-10-01 audit, item 4).
test('a full content security policy is reported, not enforced', () => {
  const headers = Object.fromEntries(SECURITY_HEADERS.map(({ key, value }) => [key.toLowerCase(), value]))
  const policy = headers['content-security-policy-report-only']
  assert.ok(policy, 'report-only policy is sent')
  assert.match(policy, /object-src 'none'/)
  assert.match(policy, /base-uri 'self'/)
  // The enforced header stays framing-only until the report-only one is clean.
  assert.equal(headers['content-security-policy'], "frame-ancestors 'none'")
})

test('the report-only policy lets the site reach its API and embeds', () => {
  const policy = reportOnlyContentSecurityPolicy('https://api.questurian.com')
  const directive = (name) => policy.split('; ').find((part) => part.startsWith(`${name} `)) ?? ''
  assert.match(directive('connect-src'), /https:\/\/api\.questurian\.com/)
  assert.match(directive('script-src'), /https:\/\/assets\.endorsely\.com/)
  assert.match(directive('script-src'), /https:\/\/www\.instagram\.com/)
  assert.match(directive('frame-src'), /https:\/\/www\.instagram\.com/)
})

// The readiness sandbox and localhost serve photos over plain http. Live must
// still allow https images only.
test('only a plain-http build allows plain-http images', () => {
  const imgSrc = (api) => reportOnlyContentSecurityPolicy(api).split('; ').find((part) => part.startsWith('img-src '))
  assert.equal(imgSrc('https://api.questurian.com'), "img-src 'self' data: blob: https:")
  assert.equal(imgSrc('http://api.readiness.localhost:4100'), "img-src 'self' data: blob: https: http:")
})
