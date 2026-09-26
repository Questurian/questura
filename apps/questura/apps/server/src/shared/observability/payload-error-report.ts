import type { AfterErrorHook } from 'payload'

import { reportLoggedError } from './logged-error-report'
import { pathOnly } from './error-reporting'
import { REQUEST_ID_HEADER, wellFormedRequestId } from './request-id'

/**
 * Payload's own REST and GraphQL handlers catch every error, log it with their
 * own logger and answer with a status. Nothing is thrown out of the route, so
 * Next's `onRequestError` never sees it, and Payload's logger is not ours, so
 * `logger.error` never sees it either. A database failure behind `/api/articles`
 * was a 500 no one would hear about.
 *
 * Only 5xx: a 400 (validation) or a 403 (access) is the caller's mistake and
 * already answered; reporting those would spend the quota on every bad save.
 * Payload's own log line stays; this adds the alarm, not a second record.
 */
export const reportPayloadError: AfterErrorHook = ({ collection, error, req }) => {
  const raw = (error as unknown as { status?: unknown }).status
  const status = typeof raw === 'number' ? raw : 500
  if (status < 500) return

  // The message is the throttle key: one per collection and status, so a
  // failing collection cannot hide a second one for the same window.
  reportLoggedError(
    `Payload ${status} on ${collection?.slug ?? 'a non-collection route'}`,
    {
      error,
      status,
      collection: collection?.slug,
      method: req.method,
      path: pathOnly(req.url),
    },
    wellFormedRequestId(req.headers?.get(REQUEST_ID_HEADER)),
  )
}
