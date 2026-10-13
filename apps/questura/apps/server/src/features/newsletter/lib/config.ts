/**
 * What the newsletter needs beyond signup, read at call time so a Railway
 * variable change takes effect on the next request.
 *
 * Signup and confirmation need none of this: they go out through the
 * transactional adapter like every other account mail. Everything here is for
 * the list's copy in Resend and for sending an issue, and each piece is
 * optional until then. A missing piece turns the feature off and says which
 * one, it never breaks boot.
 *
 *  - `RESEND_NEWSLETTER_API_KEY`: a *full access* key. Broadcasts and contacts
 *    cannot be reached with the transactional key, which is sending-only on
 *    purpose. Kept separate so it can be revoked without touching password
 *    resets.
 *  - `RESEND_NEWSLETTER_SEGMENT_ID`: the segment every confirmed subscriber is
 *    put in and every issue is sent to.
 *  - `RESEND_WEBHOOK_SECRET`: verifies Resend's unsubscribe, bounce and
 *    complaint callbacks.
 *  - `NEWSLETTER_POSTAL_ADDRESS`: printed in every issue's footer. US law
 *    (CAN-SPAM) requires a valid postal address in commercial email, so an
 *    issue cannot be sent without one. A test send to staff can.
 *  - `NEWSLETTER_FROM`: optional, defaults to `Questurian <hello@questurian.com>`
 *    so replies reach a person.
 */

export const DEFAULT_NEWSLETTER_FROM = 'Questurian <hello@questurian.com>'

export type NewsletterConfig = {
  apiKey: string
  segmentId: string
  webhookSecret: string
  postalAddress: string
  from: string
}

const read = (name: string) => (process.env[name] ?? '').trim()

export function newsletterConfig(): NewsletterConfig {
  return {
    apiKey: read('RESEND_NEWSLETTER_API_KEY'),
    segmentId: read('RESEND_NEWSLETTER_SEGMENT_ID'),
    webhookSecret: read('RESEND_WEBHOOK_SECRET'),
    postalAddress: read('NEWSLETTER_POSTAL_ADDRESS'),
    from: read('NEWSLETTER_FROM') || DEFAULT_NEWSLETTER_FROM,
  }
}

/** True when subscribers can be copied to Resend. */
export function canSyncContacts(config = newsletterConfig()): boolean {
  return Boolean(config.apiKey && config.segmentId)
}

/** What is still missing before an issue can go to the list. */
export function missingForSend(config = newsletterConfig()): string[] {
  const missing: string[] = []
  if (!config.apiKey) missing.push('RESEND_NEWSLETTER_API_KEY')
  if (!config.segmentId) missing.push('RESEND_NEWSLETTER_SEGMENT_ID')
  if (!config.webhookSecret) missing.push('RESEND_WEBHOOK_SECRET')
  if (!config.postalAddress) missing.push('NEWSLETTER_POSTAL_ADDRESS')
  return missing
}
