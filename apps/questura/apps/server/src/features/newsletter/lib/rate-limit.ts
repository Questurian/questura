import { getClientIp, hashIdentifier, incrementCounter } from '@/shared/lib/rate-limit-counter'
import { logger } from '@/shared/utils/logger'

/**
 * Throttles for the anonymous newsletter signup.
 *
 * Signup costs a real email, and email is the scarce thing: the confirmation
 * goes out on the same Resend account and domain as password resets, and the
 * free plan allows 100 sends a day across all of them. So the limits are
 * layered:
 *
 *  - per address (the caller's /64 or IPv4): stops one script filling the
 *    table or mailing strangers;
 *  - per email address: stops anyone, from any number of addresses, mailing
 *    one inbox over and over;
 *  - a daily total of confirmation sends: whatever gets through the first
 *    two, newsletter signups can never use up the day's password resets.
 *
 * Every limiter fails closed, like every other limiter here.
 */

const CALLER_WINDOW_SECONDS = 60 * 60
const MAX_SIGNUPS_PER_CALLER = 10

const MAX_CONFIRMS_PER_CALLER = 30

const EMAIL_WINDOW_SECONDS = 24 * 60 * 60
const MAX_CONFIRMATIONS_PER_EMAIL = 3

const DAILY_WINDOW_SECONDS = 24 * 60 * 60
/**
 * Leaves well over half of Resend's free-plan 100/day for account mail.
 * Raise it when the transactional plan is upgraded.
 */
export const MAX_CONFIRMATIONS_PER_DAY = 40

export type NewsletterLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number; unavailable?: boolean }

async function check(key: string, windowSeconds: number, max: number, headers: Headers): Promise<NewsletterLimitResult> {
  let counter
  try {
    counter = await incrementCounter(key, windowSeconds)
  } catch (error) {
    logger.error('[newsletter] rate limit unavailable; denying', {
      ipHash: hashIdentifier(getClientIp(headers)),
      error,
    })
    return { allowed: false, retryAfterSeconds: 5, unavailable: true }
  }
  if (counter.count > max) return { allowed: false, retryAfterSeconds: counter.ttlSeconds }
  return { allowed: true }
}

/** Every signup request, before any work. */
export function checkSignupCallerLimit(headers: Headers): Promise<NewsletterLimitResult> {
  const key = `newsletter:rate-limit:caller:${hashIdentifier(getClientIp(headers))}`
  return check(key, CALLER_WINDOW_SECONDS, MAX_SIGNUPS_PER_CALLER, headers)
}

/**
 * Every confirm request. The token is 256 random bits, so this is not about
 * guessing; it bounds the database lookups one caller can cause.
 */
export function checkConfirmCallerLimit(headers: Headers): Promise<NewsletterLimitResult> {
  const key = `newsletter:rate-limit:confirm-caller:${hashIdentifier(getClientIp(headers))}`
  return check(key, CALLER_WINDOW_SECONDS, MAX_CONFIRMS_PER_CALLER, headers)
}

/** Only when a confirmation is about to be mailed to `email`. */
export function checkConfirmationEmailLimit(email: string, headers: Headers): Promise<NewsletterLimitResult> {
  const key = `newsletter:rate-limit:email:${hashIdentifier(email)}`
  return check(key, EMAIL_WINDOW_SECONDS, MAX_CONFIRMATIONS_PER_EMAIL, headers)
}

/** Only when a confirmation is about to be mailed, after the per-email check. */
export function checkDailyConfirmationLimit(headers: Headers): Promise<NewsletterLimitResult> {
  return check('newsletter:rate-limit:daily-confirmations', DAILY_WINDOW_SECONDS, MAX_CONFIRMATIONS_PER_DAY, headers)
}
