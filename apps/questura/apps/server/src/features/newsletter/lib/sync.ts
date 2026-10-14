import { getPayload, type Payload } from 'payload'

import config from '@/payload.config'
import { maskEmail } from '@/features/emails/lib/mask-email'
import { logger } from '@/shared/utils/logger'
import { canSyncContacts, newsletterConfig } from './config'
import { listSegmentContacts, unsubscribeContact, upsertContact } from './resend-api'

/**
 * Keeps Resend's copy of the list in step with Payload's.
 *
 * Payload is the list. Resend holds a copy only because broadcasts are sent
 * to a Resend segment. Two paths keep the copy right:
 *
 *  - `pushSubscriberState`, on every change made here (a confirmation, an
 *    unsubscribe from the account page). Best effort: a failure is logged and
 *    left for the next path, never surfaced to the reader.
 *  - `reconcileBeforeSend`, which runs immediately before every issue and
 *    repairs whatever the first path missed.
 *
 * Changes made on Resend's side (the unsubscribe link in an issue, a bounce,
 * a spam complaint) come back through the webhook (`webhook.ts`).
 */

const COLLECTION = 'newsletter-subscribers' as const

export async function pushSubscriberState(email: string, subscribed: boolean): Promise<void> {
  const settings = newsletterConfig()
  if (!canSyncContacts(settings)) return
  try {
    if (subscribed) await upsertContact(settings.apiKey, settings.segmentId, email, false)
    else await unsubscribeContact(settings.apiKey, email)
  } catch (error) {
    logger.error('[newsletter] could not update Resend contact; reconcile will retry', {
      email: maskEmail(email),
      subscribed,
      error,
    })
  }
}

export type ReconcileReport = {
  /** Confirmed here but missing or unsubscribed in Resend: now subscribed there. */
  pushed: number
  /** Subscribed in Resend but not here: now unsubscribed there. */
  unsubscribedInResend: number
  /** Unsubscribed in Resend after confirming here, with the webhook missed: now unsubscribed here. */
  pulledUnsubscribes: number
  /** Who the issue will reach. */
  recipients: number
}

async function allRows(payload: Payload) {
  const { docs } = await payload.find({
    collection: COLLECTION,
    pagination: false,
    depth: 0,
    select: { email: true, status: true, confirmedAt: true },
  })
  return docs
}

/**
 * Makes the Resend segment's subscribed contacts exactly Payload's
 * `subscribed` rows.
 *
 * The one disagreement with no obvious winner is a contact unsubscribed in
 * Resend whose row here is `subscribed`. It is either a reader who clicked
 * the issue's unsubscribe link while the webhook was down (Resend is newer:
 * honour it) or a reader who unsubscribed long ago and has since signed up
 * and confirmed again while the push failed (Payload is newer). The contact's
 * `updated_at` against the row's `confirmedAt` decides which.
 */
export async function reconcileBeforeSend(now = new Date()): Promise<ReconcileReport> {
  const settings = newsletterConfig()
  if (!canSyncContacts(settings)) throw new Error('Resend newsletter settings are missing.')

  const payload = await getPayload({ config })
  const [rows, contacts] = await Promise.all([
    allRows(payload),
    listSegmentContacts(settings.apiKey, settings.segmentId),
  ])
  const contactsByEmail = new Map(contacts.map((contact) => [contact.email.toLowerCase(), contact]))
  const subscribedEmails = new Set<string>()
  const report: ReconcileReport = { pushed: 0, unsubscribedInResend: 0, pulledUnsubscribes: 0, recipients: 0 }

  for (const row of rows) {
    if (row.status !== 'subscribed') continue
    const contact = contactsByEmail.get(row.email)

    if (contact?.unsubscribed) {
      const resendIsNewer =
        contact.updated_at && row.confirmedAt && new Date(contact.updated_at) > new Date(row.confirmedAt)
      if (resendIsNewer) {
        await payload.update({
          collection: COLLECTION,
          id: row.id,
          data: { status: 'unsubscribed', unsubscribedAt: now.toISOString() },
        })
        report.pulledUnsubscribes += 1
        continue
      }
    }

    if (!contact || contact.unsubscribed) {
      await upsertContact(settings.apiKey, settings.segmentId, row.email, false)
      report.pushed += 1
    }
    subscribedEmails.add(row.email)
  }

  for (const contact of contacts) {
    if (contact.unsubscribed || subscribedEmails.has(contact.email.toLowerCase())) continue
    await unsubscribeContact(settings.apiKey, contact.email)
    report.unsubscribedInResend += 1
  }

  report.recipients = subscribedEmails.size
  return report
}
