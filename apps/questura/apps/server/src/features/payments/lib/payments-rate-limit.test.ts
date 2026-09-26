import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resetLocalCounters } from '@/shared/lib/rate-limit-counter'
import {
  PAYMENTS_RATE_LIMITS,
  checkPaymentsRateLimit,
  checkPaymentsVisitorRateLimit,
} from './payments-rate-limit'

function headersWithIp(ip: string) {
  return new Headers({ 'x-forwarded-for': ip })
}

describe('payments rate limit', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    resetLocalCounters()
  })

  it('allows checkout under the per-IP ceiling', async () => {
    const headers = headersWithIp('192.0.2.10')

    for (let i = 0; i < PAYMENTS_RATE_LIMITS.checkout.ip; i += 1) {
      await expect(checkPaymentsRateLimit(headers, 'checkout')).resolves.toEqual({ allowed: true })
    }
  })

  it('rejects the next checkout over the ceiling', async () => {
    const headers = headersWithIp('192.0.2.11')

    for (let i = 0; i < PAYMENTS_RATE_LIMITS.checkout.ip; i += 1) {
      await checkPaymentsRateLimit(headers, 'checkout')
    }

    await expect(checkPaymentsRateLimit(headers, 'checkout')).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: expect.any(Number),
    })
  })

  it('does not share a budget across scopes', async () => {
    const headers = headersWithIp('192.0.2.12')

    for (let i = 0; i < PAYMENTS_RATE_LIMITS.checkout.ip; i += 1) {
      await checkPaymentsRateLimit(headers, 'checkout')
    }

    await expect(checkPaymentsRateLimit(headers, 'plans')).resolves.toEqual({ allowed: true })
  })

  it('does not share a budget across IPs', async () => {
    const first = headersWithIp('192.0.2.13')
    for (let i = 0; i < PAYMENTS_RATE_LIMITS.checkout.ip; i += 1) {
      await checkPaymentsRateLimit(first, 'checkout')
    }

    await expect(checkPaymentsRateLimit(headersWithIp('192.0.2.14'), 'checkout')).resolves.toEqual({
      allowed: true,
    })
  })

  it('rejects the next checkout after one visitor hits the ceiling, even from a fresh IP', async () => {
    for (let i = 0; i < PAYMENTS_RATE_LIMITS.checkout.visitor; i += 1) {
      await expect(
        checkPaymentsVisitorRateLimit('visitor_nat_a', 'checkout')
      ).resolves.toEqual({ allowed: true })
    }

    await expect(checkPaymentsVisitorRateLimit('visitor_nat_a', 'checkout')).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: expect.any(Number),
    })
  })

  it('does not share a visitor budget across visitors', async () => {
    for (let i = 0; i < PAYMENTS_RATE_LIMITS.checkout.visitor; i += 1) {
      await checkPaymentsVisitorRateLimit('visitor_a', 'checkout')
    }

    await expect(checkPaymentsVisitorRateLimit('visitor_b', 'checkout')).resolves.toEqual({
      allowed: true,
    })
  })

  it('does not share a visitor budget across scopes', async () => {
    for (let i = 0; i < PAYMENTS_RATE_LIMITS.checkout.visitor; i += 1) {
      await checkPaymentsVisitorRateLimit('visitor_scope', 'checkout')
    }

    await expect(checkPaymentsVisitorRateLimit('visitor_scope', 'portal')).resolves.toEqual({
      allowed: true,
    })
  })

  it('lets two visitors behind one NAT IP each spend a full checkout budget', async () => {
    const nat = headersWithIp('192.0.2.50')

    for (let i = 0; i < PAYMENTS_RATE_LIMITS.checkout.visitor; i += 1) {
      await expect(checkPaymentsRateLimit(nat, 'checkout')).resolves.toEqual({ allowed: true })
      await expect(checkPaymentsVisitorRateLimit('visitor_nat_1', 'checkout')).resolves.toEqual({
        allowed: true,
      })
    }

    for (let i = 0; i < PAYMENTS_RATE_LIMITS.checkout.visitor; i += 1) {
      await expect(checkPaymentsRateLimit(nat, 'checkout')).resolves.toEqual({ allowed: true })
      await expect(checkPaymentsVisitorRateLimit('visitor_nat_2', 'checkout')).resolves.toEqual({
        allowed: true,
      })
    }
  })

  describe('join page render budget', () => {
    const TOKEN = 'r'.repeat(40)

    beforeEach(() => {
      vi.stubEnv('QUESTURA_RENDER_TOKEN', TOKEN)
      vi.stubEnv('PUBLIC_READ_RENDER_MULTIPLIER', '')
    })

    // The Worker's plans read shares one egress IP across every reader it
    // renders for; 30 a minute was one burst away from "nothing for sale".
    it('gives a token-bearing render its own larger plans bucket, still bounded', async () => {
      const render = new Headers({ 'x-forwarded-for': '192.0.2.60', 'x-questura-render-token': TOKEN })

      for (let i = 0; i < PAYMENTS_RATE_LIMITS.plans.ip * 20; i += 1) {
        await expect(checkPaymentsRateLimit(render, 'plans')).resolves.toEqual({ allowed: true })
      }
      await expect(checkPaymentsRateLimit(render, 'plans')).resolves.toMatchObject({ allowed: false })

      // Its own key: readers calling from that same IP keep their own budget.
      await expect(checkPaymentsRateLimit(headersWithIp('192.0.2.60'), 'plans')).resolves.toEqual({
        allowed: true,
      })
    })

    it('treats a wrong token as an ordinary per-IP caller', async () => {
      const guess = new Headers({ 'x-forwarded-for': '192.0.2.61', 'x-questura-render-token': 'guess' })

      for (let i = 0; i < PAYMENTS_RATE_LIMITS.plans.ip; i += 1) {
        await checkPaymentsRateLimit(guess, 'plans')
      }
      await expect(checkPaymentsRateLimit(guess, 'plans')).resolves.toMatchObject({ allowed: false })
    })

    it('does not widen the visitor-acting routes', async () => {
      const render = new Headers({ 'x-forwarded-for': '192.0.2.62', 'x-questura-render-token': TOKEN })

      for (let i = 0; i < PAYMENTS_RATE_LIMITS.checkout.ip; i += 1) {
        await checkPaymentsRateLimit(render, 'checkout')
      }
      await expect(checkPaymentsRateLimit(render, 'checkout')).resolves.toMatchObject({ allowed: false })
    })
  })

  it('builds a 429 with Retry-After', async () => {
    const { paymentsRateLimitResponse } = await import('./payments-rate-limit')
    const response = paymentsRateLimitResponse({ 'Access-Control-Allow-Origin': 'http://localhost:3000' }, 17)

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('17')
    await expect(response.json()).resolves.toEqual({
      error: 'Too many attempts. Please try again shortly.',
    })
  })
})
