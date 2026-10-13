/**
 * Resend → Payload: unsubscribes, hard bounces and spam complaints
 * (`features/newsletter/lib/webhook.ts`).
 *
 * Server to server, so there is no origin check and no CORS; the Svix
 * signature is the only gate, and nothing is read from the body before it
 * passes. Every event sets a status, so a redelivered event is harmless.
 */

import { NextRequest, NextResponse } from 'next/server'

import { newsletterConfig } from '@/features/newsletter/lib/config'
import { handleResendEvent, verifyResendWebhook } from '@/features/newsletter/lib/webhook'
import { logger } from '@/shared/utils/logger'

const MAX_BODY_BYTES = 256 * 1024

export async function POST(req: NextRequest) {
  const { webhookSecret } = newsletterConfig()
  if (!webhookSecret) return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 })

  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 })
  }
  const rawBody = await req.text()
  if (rawBody.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 })

  const verified = verifyResendWebhook(webhookSecret, rawBody, {
    id: req.headers.get('svix-id'),
    timestamp: req.headers.get('svix-timestamp'),
    signature: req.headers.get('svix-signature'),
  })
  if (!verified) return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })

  let event: unknown
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }

  try {
    await handleResendEvent(event as Parameters<typeof handleResendEvent>[0])
  } catch (error) {
    // 500 makes Resend retry, which is what an unsaved unsubscribe needs.
    logger.error('[newsletter] webhook event failed', { type: (event as { type?: unknown })?.type, error })
    return NextResponse.json({ error: 'Failed.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
