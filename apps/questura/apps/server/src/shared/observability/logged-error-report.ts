import { redact } from './redact'
import { sentrySlot } from './sentry-slot'

/**
 * Errors the code caught, logged and answered itself: a route's `catch` that
 * returns a 500, a webhook that could not be processed, a rate limiter whose
 * counter is down. Next's `onRequestError` never sees these, because nothing
 * was thrown out of the route. On moving day "Error creating checkout
 * session" reached the Railway logs and never Sentry.
 *
 * `logger.error` calls this, so every error line reaches Sentry unless the
 * call site opts out with `{ report: false }`. Opting in would be the same
 * mistake again: the next caught error would be forgotten the same way.
 *
 * Opt out only where a stranger can produce the line at will (a forged
 * webhook signature) or where the caller reports the same failure itself.
 *
 * **Throttled per message.** The Sentry plan has a monthly quota, and one
 * failure behind every request (Redis down under a rate limiter) would spend
 * it in minutes and leave nothing for the next real alert. One event per
 * message per window per process is enough: the alert fires on the first
 * event of an issue, and the log lines keep the full count.
 */

export const REPORT_WINDOW_MS = 60_000
const MAX_TRACKED_MESSAGES = 500

const lastReportedAt = new Map<string, number>()

function throttled(message: string, now: number): boolean {
  const last = lastReportedAt.get(message)
  if (last !== undefined && now - last < REPORT_WINDOW_MS) return true
  if (lastReportedAt.size >= MAX_TRACKED_MESSAGES) lastReportedAt.clear()
  lastReportedAt.set(message, now)
  return false
}

/** Test seam. */
export function resetReportThrottleForTests(): void {
  lastReportedAt.clear()
}

/**
 * One Sentry event for a caught error, when reporting is on. Never throws.
 *
 * An `Error` in `data.error` is captured as an exception, so the event has its
 * stack and Sentry groups it by cause; the SDK also marks the object, so if
 * the same error is later thrown out of the route it is not sent twice.
 * Anything else becomes a message grouped by the log line's own text.
 */
export function reportLoggedError(
  message: string,
  data: Record<string, unknown> | undefined,
  requestId: string | undefined,
  now: number = Date.now(),
): void {
  const client = sentrySlot.client
  if (!client) return
  if (throttled(message, now)) return

  try {
    const { error, ...fields } = data ?? {}
    client.withScope((scope) => {
      scope.setTags({
        source: 'logged',
        log_message: message.slice(0, 200),
        ...(requestId ? { request_id: requestId } : {}),
      })
      // Redacted here and again by the scrubber on the way out.
      scope.setContext('log', redact(fields))
      if (error instanceof Error) {
        client.captureException(error)
      } else {
        scope.setFingerprint(['logged-error', message])
        client.captureMessage(error === undefined ? message : `${message}: ${String(error)}`, 'error')
      }
    })
  } catch {
    // Already logged; the reporter must never turn one error into two.
  }
}
