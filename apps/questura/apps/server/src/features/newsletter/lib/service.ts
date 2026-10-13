import { randomBytes } from 'node:crypto'
import { getPayload, type Payload } from 'payload'

import config from '@/payload.config'
import { sendNewsletterConfirmationEmail } from '@/features/emails'
import { APP_URLS } from '@/shared/config'
import { hashIdentifier } from '@/shared/lib/rate-limit-counter'
import { logger } from '@/shared/utils/logger'
import { maskEmail } from '@/features/emails/lib/mask-email'
import { CONFIRM_PAGE_PATH, CONFIRM_TOKEN_TTL_MS, type NewsletterSignupSource } from './constants'
import { checkConfirmationEmailLimit, checkDailyConfirmationLimit } from './rate-limit'
import { pushSubscriberState } from './sync'

const COLLECTION = 'newsletter-subscribers' as const

export type SubscribeResult =
  /** A confirmation was mailed. */
  | { outcome: 'confirmation-sent' }
  /**
   * Nothing was mailed, on purpose: already subscribed, never to be mailed
   * again (bounced / complained), or this inbox has had its confirmations
   * for the day. The caller must answer exactly as for `confirmation-sent`,
   * so the form cannot be used to learn who is on the list.
   */
  | { outcome: 'nothing-to-send' }
  /** The daily confirmation budget is spent, or the counter is down. */
  | { outcome: 'busy'; retryAfterSeconds: number; unavailable?: boolean }
  /** The row is saved as `pending`, but the mail did not go out. */
  | { outcome: 'send-failed' }

export type ConfirmResult = 'confirmed' | 'expired' | 'invalid'

/** 32 random bytes, base64url: exactly what `subscribe` mails. */
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/

export function isWellFormedConfirmToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_SHAPE.test(value)
}

/** Never mailed again, whatever form they type into. */
const SUPPRESSED = new Set(['bounced', 'complained'])

async function findByEmail(payload: Payload, email: string) {
  const { docs } = await payload.find({
    collection: COLLECTION,
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
  })
  return docs[0] ?? null
}

/**
 * Records a signup and mails the double opt-in link.
 *
 * Re-signing up is how a lost or expired link is replaced, so a `pending` row
 * gets a fresh token (the old link stops working) and an `unsubscribed` row
 * goes back to `pending` with a new consent time. It is not `subscribed`
 * again until the new link is clicked.
 */
export async function subscribe({
  email,
  source,
  headers,
  now = new Date(),
}: {
  email: string
  source: NewsletterSignupSource
  headers: Headers
  now?: Date
}): Promise<SubscribeResult> {
  const payload = await getPayload({ config })
  let existing = await findByEmail(payload, email)

  if (existing && (existing.status === 'subscribed' || SUPPRESSED.has(existing.status))) {
    return { outcome: 'nothing-to-send' }
  }

  const perEmail = await checkConfirmationEmailLimit(email, headers)
  if (!perEmail.allowed) {
    return perEmail.unavailable
      ? { outcome: 'busy', retryAfterSeconds: perEmail.retryAfterSeconds, unavailable: true }
      : { outcome: 'nothing-to-send' }
  }

  const daily = await checkDailyConfirmationLimit(headers)
  if (!daily.allowed) {
    logger.warn('[newsletter] daily confirmation budget spent; signup deferred', { email: maskEmail(email) })
    return { outcome: 'busy', retryAfterSeconds: daily.retryAfterSeconds, unavailable: daily.unavailable }
  }

  const token = randomBytes(32).toString('base64url')
  const data = {
    status: 'pending' as const,
    source,
    signedUpAt: now.toISOString(),
    confirmTokenHash: hashIdentifier(token),
    confirmTokenExpiresAt: new Date(now.getTime() + CONFIRM_TOKEN_TTL_MS).toISOString(),
  }

  if (!existing) {
    try {
      await payload.create({ collection: COLLECTION, data: { email, ...data } })
    } catch (error) {
      // Two submits of one address at once: the unique index let one in.
      existing = await findByEmail(payload, email)
      if (!existing) throw error
    }
  }
  if (existing) {
    await payload.update({ collection: COLLECTION, id: existing.id, data })
  }

  const url = `${APP_URLS.frontendUrl(CONFIRM_PAGE_PATH)}?token=${token}`
  const sent = await sendNewsletterConfirmationEmail(payload, { email, url })
  return sent.success ? { outcome: 'confirmation-sent' } : { outcome: 'send-failed' }
}

/**
 * Turns a confirmation link into a subscription.
 *
 * The token stays on the row after it is used, so a second click (or a mail
 * scanner that followed the page) still reads as `confirmed` rather than
 * telling the reader their link is broken. It stops working only when a new
 * signup replaces it, or once the row is anything but `pending` or
 * `subscribed`: an old link must never undo an unsubscribe.
 */
export async function confirm(token: string, now = new Date()): Promise<ConfirmResult> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: COLLECTION,
    where: { confirmTokenHash: { equals: hashIdentifier(token) } },
    limit: 1,
    depth: 0,
  })
  const row = docs[0]
  if (!row) return 'invalid'
  if (row.status === 'subscribed') return 'confirmed'
  if (row.status !== 'pending') return 'invalid'

  const expiresAt = row.confirmTokenExpiresAt ? new Date(row.confirmTokenExpiresAt) : null
  if (!expiresAt || expiresAt <= now) return 'expired'

  await payload.update({
    collection: COLLECTION,
    id: row.id,
    data: { status: 'subscribed', confirmedAt: now.toISOString() },
  })
  await pushSubscriberState(row.email, true)
  return 'confirmed'
}

export type AccountNewsletterStatus = 'subscribed' | 'pending' | 'not-subscribed'

/** What the account page shows for the signed-in reader's address. */
export async function accountStatus(email: string): Promise<AccountNewsletterStatus> {
  const payload = await getPayload({ config })
  const row = await findByEmail(payload, email)
  if (row?.status === 'subscribed') return 'subscribed'
  if (row?.status === 'pending') return 'pending'
  return 'not-subscribed'
}

/**
 * The account page's switch, turned on.
 *
 * A verified account email has already proved the inbox is the reader's, so
 * it is subscribed at once; that click is the consent, recorded as source
 * `account`. An unverified one goes through the normal double opt-in.
 * A suppressed address (bounced, complained) stays suppressed either way.
 */
export async function accountSubscribe({
  email,
  emailVerified,
  headers,
  now = new Date(),
}: {
  email: string
  emailVerified: boolean
  headers: Headers
  now?: Date
}): Promise<SubscribeResult | { outcome: 'subscribed' }> {
  if (!emailVerified) return subscribe({ email, source: 'account', headers, now })

  const payload = await getPayload({ config })
  const existing = await findByEmail(payload, email)
  if (existing && SUPPRESSED.has(existing.status)) return { outcome: 'nothing-to-send' }
  if (existing?.status === 'subscribed') return { outcome: 'subscribed' }

  const data = {
    status: 'subscribed' as const,
    source: 'account' as const,
    signedUpAt: now.toISOString(),
    confirmedAt: now.toISOString(),
  }
  if (existing) await payload.update({ collection: COLLECTION, id: existing.id, data })
  else await payload.create({ collection: COLLECTION, data: { email, ...data } })
  await pushSubscriberState(email, true)
  return { outcome: 'subscribed' }
}

/**
 * A reader said stop: the account switch (`from: 'site'`, copied to Resend)
 * or Resend's own unsubscribe link (`from: 'resend'`, already true there).
 * Never copied back to Resend in the second case: that write would fire
 * another `contact.updated` webhook, and that one another write.
 */
export async function unsubscribe(email: string, from: 'site' | 'resend', now = new Date()): Promise<void> {
  const payload = await getPayload({ config })
  const row = await findByEmail(payload, email)
  if (row && (row.status === 'subscribed' || row.status === 'pending')) {
    await payload.update({
      collection: COLLECTION,
      id: row.id,
      data: { status: 'unsubscribed', unsubscribedAt: now.toISOString() },
    })
  }
  if (from === 'site') await pushSubscriberState(email, false)
}

/**
 * A hard bounce or a spam complaint. Terminal for mail: no confirmation and
 * no issue goes to the address again. A complaint outranks a bounce.
 */
export async function suppress(email: string, reason: 'bounced' | 'complained'): Promise<void> {
  const payload = await getPayload({ config })
  const row = await findByEmail(payload, email)
  if (!row || row.status === 'complained' || row.status === reason) return
  await payload.update({ collection: COLLECTION, id: row.id, data: { status: reason } })
}
