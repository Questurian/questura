import { createHmac, timingSafeEqual } from 'node:crypto'

import { suppress, unsubscribe } from './service'

/**
 * Resend's callbacks, which carry the changes made on Resend's side of the
 * list back to Payload: the unsubscribe link in an issue, hard bounces and
 * spam complaints. Without them a reader who clicked unsubscribe would still
 * read `subscribed` here.
 */

/** Resend signs with Svix: five minutes either side of now, as Svix's own libraries allow. */
const TOLERANCE_SECONDS = 5 * 60

export type WebhookHeaders = { id: string | null; timestamp: string | null; signature: string | null }

/**
 * Svix signature check, done by hand so the newsletter needs no SDK.
 * The signed content is `${id}.${timestamp}.${rawBody}`, keyed with the
 * base64 part of the `whsec_` secret; the header may carry several
 * space-separated `v1,<base64>` signatures during a secret rotation.
 */
export function verifyResendWebhook(
  secret: string,
  rawBody: string,
  headers: WebhookHeaders,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const { id, timestamp, signature } = headers
  if (!secret || !id || !timestamp || !signature) return false

  const sentAt = Number(timestamp)
  if (!Number.isInteger(sentAt) || Math.abs(nowSeconds - sentAt) > TOLERANCE_SECONDS) return false

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest()

  return signature.split(' ').some((entry) => {
    const [version, value] = entry.split(',')
    if (version !== 'v1' || !value) return false
    const given = Buffer.from(value, 'base64')
    return given.length === expected.length && timingSafeEqual(given, expected)
  })
}

type ResendEvent = {
  type?: unknown
  data?: {
    email?: unknown
    unsubscribed?: unknown
    to?: unknown
    bounce?: { type?: unknown }
  }
}

function addresses(value: unknown): string[] {
  const list = Array.isArray(value) ? value : [value]
  return list.filter((item): item is string => typeof item === 'string').map((item) => item.trim().toLowerCase())
}

/** Applies one verified event. Unknown types are ignored, so subscribing to more events later is harmless. */
export async function handleResendEvent(event: ResendEvent): Promise<void> {
  const data = event.data ?? {}
  switch (event.type) {
    case 'contact.updated':
      if (data.unsubscribed === true) {
        for (const email of addresses(data.email)) await unsubscribe(email, 'resend')
      }
      return
    case 'contact.deleted':
      // A contact deleted in the dashboard can no longer be mailed; read it as stop.
      for (const email of addresses(data.email)) await unsubscribe(email, 'resend')
      return
    case 'email.bounced':
      // Transient bounces (a full mailbox) retry on their own; only a permanent one ends the address.
      if (data.bounce?.type === 'Permanent') {
        for (const email of addresses(data.to)) await suppress(email, 'bounced')
      }
      return
    case 'email.suppressed':
      for (const email of addresses(data.to)) await suppress(email, 'bounced')
      return
    case 'email.complained':
      for (const email of addresses(data.to)) await suppress(email, 'complained')
      return
  }
}
