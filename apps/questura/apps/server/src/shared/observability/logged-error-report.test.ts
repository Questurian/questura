import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { logger } from '@/shared/utils/logger'
import { setSentryClientForTests } from './error-reporting'
import { REPORT_WINDOW_MS, reportLoggedError, resetReportThrottleForTests } from './logged-error-report'
import { reportPayloadError } from './payload-error-report'
import { runWithRequestId } from './request-id'

/**
 * Phase 3B: an error the code caught and answered itself must still reach
 * Sentry. On moving day "Error creating checkout session" reached the logs
 * and never the owner's phone.
 */

function fakeSentry() {
  const tags: Record<string, string> = {}
  const scope = {
    setTag: vi.fn(),
    setTags: vi.fn((values: Record<string, string>) => Object.assign(tags, values)),
    setContext: vi.fn(),
    setFingerprint: vi.fn(),
  }
  const client = {
    init: vi.fn(),
    withScope: vi.fn((fn: (s: typeof scope) => unknown) => fn(scope)),
    captureRequestError: vi.fn(),
    captureMessage: vi.fn(),
    captureException: vi.fn(),
    flush: vi.fn(async () => true),
  }
  return { client, scope, tags }
}

let sentry: ReturnType<typeof fakeSentry>

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  resetReportThrottleForTests()
  sentry = fakeSentry()
  setSentryClientForTests(sentry.client as never)
})

afterEach(() => {
  setSentryClientForTests(null)
  vi.restoreAllMocks()
})

describe('logger.error reports to Sentry', () => {
  it('sends a caught Error as an exception carrying the request id and the log message', () => {
    const error = new Error('stripe unreachable')

    runWithRequestId('req-handled-0001', () =>
      logger.error('Error creating checkout session', { error, plan: 'monthly' }),
    )

    expect(sentry.client.captureException).toHaveBeenCalledWith(error)
    expect(sentry.tags).toMatchObject({
      source: 'logged',
      log_message: 'Error creating checkout session',
      request_id: 'req-handled-0001',
    })
    expect(sentry.scope.setContext).toHaveBeenCalledWith('log', { plan: 'monthly' })
  })

  it('sends a string error as a message grouped by the log line', () => {
    logger.error('Private route failed on a dependency', { error: 'redis down' })

    expect(sentry.client.captureMessage).toHaveBeenCalledWith(
      'Private route failed on a dependency: redis down',
      'error',
    )
    expect(sentry.scope.setFingerprint).toHaveBeenCalledWith([
      'logged-error',
      'Private route failed on a dependency',
    ])
  })

  it('stays quiet when the call site opts out, and still writes the log line', () => {
    const log = vi.mocked(console.log)
    logger.error('Stripe webhook signature verification failed', { error: 'bad sig' }, { report: false })

    expect(sentry.client.captureMessage).not.toHaveBeenCalled()
    expect(sentry.client.captureException).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledTimes(1)
  })

  it('does nothing when reporting is off', () => {
    setSentryClientForTests(null)
    expect(() => logger.error('Error creating checkout session', { error: new Error('x') })).not.toThrow()
  })

  it('warn does not report', () => {
    logger.warn('Checkout replayed a session', {})
    expect(sentry.client.withScope).not.toHaveBeenCalled()
  })

  it('never throws when the SDK does', () => {
    sentry.client.withScope.mockImplementation(() => {
      throw new Error('sdk broke')
    })
    expect(() => logger.error('Error creating checkout session', { error: new Error('x') })).not.toThrow()
  })
})

describe('the per-message throttle', () => {
  it('sends one event per message per window, so an outage cannot spend the quota', () => {
    const t0 = 1_000_000
    for (let i = 0; i < 50; i += 1) reportLoggedError('Payments rate limit unavailable; denying', { error: 'down' }, undefined, t0 + i)
    reportLoggedError('Articles full rate limit unavailable; denying', { error: 'down' }, undefined, t0)

    expect(sentry.client.captureMessage).toHaveBeenCalledTimes(2)

    reportLoggedError('Payments rate limit unavailable; denying', { error: 'down' }, undefined, t0 + REPORT_WINDOW_MS)
    expect(sentry.client.captureMessage).toHaveBeenCalledTimes(3)
  })
})

describe('reportPayloadError (Payload afterError)', () => {
  function args(error: Error, slug?: string) {
    return {
      error,
      collection: slug ? ({ slug } as never) : undefined,
      context: {},
      req: {
        method: 'POST',
        url: 'https://api.questurian.com/api/articles/45?draft=true&token=abc',
        headers: new Headers({ 'x-request-id': 'req-payload-0001' }),
      } as never,
    }
  }

  it('reports a 500 with its collection, path without the query, and request id', () => {
    const error = new Error('connection terminated')
    reportPayloadError(args(error, 'articles'))

    expect(sentry.client.captureException).toHaveBeenCalledWith(error)
    expect(sentry.tags).toMatchObject({ log_message: 'Payload 500 on articles' })
    expect(sentry.scope.setContext).toHaveBeenCalledWith('log', {
      status: 500,
      collection: 'articles',
      method: 'POST',
      path: 'https://api.questurian.com/api/articles/45',
    })
  })

  it('ignores 4xx: a failed validation or a refused access is already answered', () => {
    const validation = Object.assign(new Error('The following field is invalid'), { status: 400 })
    const forbidden = Object.assign(new Error('You are not allowed to perform this action.'), { status: 403 })
    reportPayloadError(args(validation, 'articles'))
    reportPayloadError(args(forbidden, 'articles'))

    expect(sentry.client.withScope).not.toHaveBeenCalled()
  })
})
