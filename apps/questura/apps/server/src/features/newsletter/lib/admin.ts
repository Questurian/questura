import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'

import config from '@/payload.config'
import { authenticateRequest, getCorsHeaders } from '@/features/auth/lib/auth-middleware'
import type { User } from '@/payload-types'
import { APP_URLS } from '@/shared/config'
import { incrementCounter } from '@/shared/lib/rate-limit-counter'
import { logger } from '@/shared/utils/logger'
import { canSyncContacts, missingForSend, newsletterConfig } from './config'
import { NEWSLETTER_SUBSCRIBER_STATUSES, type NewsletterSubscriberStatus } from './constants'
import {
  findNewArticles,
  parseIssueDraft,
  renderIssue,
  resolveIssueItems,
  RESEND_UNSUBSCRIBE_PLACEHOLDER,
  type IssueDraft,
} from './issue'
import { createAndSendBroadcast, listBroadcasts, sendSingleEmail } from './resend-api'
import { reconcileBeforeSend } from './sync'

/**
 * The Studio composer's side of the server: staff admins only.
 *
 * Every handler here answers through `withAdmin`, which authenticates the
 * Payload staff session (the cookie Studio already carries) before anything
 * else runs.
 */

type Handler = (ctx: { req: NextRequest; user: User; cors: Record<string, string> }) => Promise<NextResponse>

export async function withAdmin(req: NextRequest, handler: Handler): Promise<NextResponse> {
  const cors = getCorsHeaders(req)
  const auth = await authenticateRequest(req, { requireAuth: true, allowedRoles: ['admin'] })
  if (auth.error || !auth.user || auth.user.collection !== 'users') {
    return NextResponse.json({ message: auth.error ?? 'Staff account required' }, { status: auth.status || 403, headers: cors })
  }
  try {
    return await handler({ req, user: auth.user as User, cors })
  } catch (error) {
    logger.error('[newsletter] admin request failed', { path: req.nextUrl.pathname, error })
    const message = error instanceof Error ? error.message : 'Newsletter request failed.'
    return NextResponse.json({ message }, { status: 500, headers: cors })
  }
}

const NO_POSTAL_ADDRESS = '[Postal address: set NEWSLETTER_POSTAL_ADDRESS before sending to the list]'
const DEFAULT_LOOKBACK_DAYS = 31

export type LastIssue = { sentAt: string; name: string | null } | null

async function lastIssue(): Promise<LastIssue> {
  const settings = newsletterConfig()
  if (!canSyncContacts(settings)) return null
  try {
    const sent = (await listBroadcasts(settings.apiKey))
      .filter((broadcast) => broadcast.segment_id === settings.segmentId && broadcast.sent_at)
      .sort((a, b) => b.sent_at!.localeCompare(a.sent_at!))
    return sent[0] ? { sentAt: sent[0].sent_at!, name: sent[0].name } : null
  } catch (error) {
    logger.warn('[newsletter] could not read past broadcasts', { error })
    return null
  }
}

export async function overview() {
  const payload = await getPayload({ config })
  const counts = Object.fromEntries(
    await Promise.all(
      NEWSLETTER_SUBSCRIBER_STATUSES.map(async (status) => {
        const { totalDocs } = await payload.count({
          collection: 'newsletter-subscribers',
          where: { status: { equals: status } },
        })
        return [status, totalDocs] as const
      }),
    ),
  ) as Record<NewsletterSubscriberStatus, number>
  const settings = newsletterConfig()
  return { counts, missing: missingForSend(settings), from: settings.from, lastIssue: await lastIssue() }
}

export async function candidates(sinceParam: string | null) {
  let since = sinceParam ? new Date(sinceParam) : null
  if (!since || Number.isNaN(since.getTime())) {
    const last = await lastIssue()
    since = last ? new Date(last.sentAt) : new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  }
  return { since: since.toISOString(), items: await findNewArticles(since) }
}

async function draftFrom(req: NextRequest): Promise<IssueDraft | { error: string }> {
  try {
    return parseIssueDraft(await req.json())
  } catch {
    return { error: 'Invalid request.' }
  }
}

export async function preview(req: NextRequest, cors: Record<string, string>) {
  const draft = await draftFrom(req)
  if ('error' in draft) return NextResponse.json({ message: draft.error }, { status: 400, headers: cors })
  const items = await resolveIssueItems(draft.items)
  const { postalAddress } = newsletterConfig()
  const { html } = renderIssue(draft, items, {
    unsubscribeUrl: APP_URLS.frontendUrl('/account'),
    postalAddress: postalAddress || NO_POSTAL_ADDRESS,
  })
  return NextResponse.json({ html, itemCount: items.length }, { headers: cors })
}

export async function sendTest(req: NextRequest, user: User, cors: Record<string, string>) {
  const draft = await draftFrom(req)
  if ('error' in draft) return NextResponse.json({ message: draft.error }, { status: 400, headers: cors })
  const settings = newsletterConfig()
  if (!settings.apiKey) {
    return NextResponse.json({ message: 'RESEND_NEWSLETTER_API_KEY is not set on the server.' }, { status: 503, headers: cors })
  }
  const items = await resolveIssueItems(draft.items)
  const { html, text } = renderIssue(draft, items, {
    unsubscribeUrl: APP_URLS.frontendUrl('/account'),
    postalAddress: settings.postalAddress || NO_POSTAL_ADDRESS,
  })
  await sendSingleEmail(settings.apiKey, { from: settings.from, to: user.email, subject: `[Test] ${draft.subject}`, html, text })
  return NextResponse.json({ to: user.email }, { headers: cors })
}

/** One issue per ten minutes, across every server instance: a double click must not mail the list twice. */
const SEND_LOCK_SECONDS = 10 * 60

export async function sendIssue(req: NextRequest, cors: Record<string, string>) {
  const draft = await draftFrom(req)
  if ('error' in draft) return NextResponse.json({ message: draft.error }, { status: 400, headers: cors })

  const settings = newsletterConfig()
  const missing = missingForSend(settings)
  if (missing.length > 0) {
    return NextResponse.json({ message: `Not configured yet: ${missing.join(', ')}.` }, { status: 503, headers: cors })
  }

  const items = await resolveIssueItems(draft.items)
  if (items.length === 0) {
    return NextResponse.json({ message: 'None of the picked articles is published.' }, { status: 400, headers: cors })
  }

  const lock = await incrementCounter('newsletter:send-lock', SEND_LOCK_SECONDS)
  if (lock.count > 1) {
    return NextResponse.json(
      { message: `An issue was sent in the last ten minutes. Try again in ${Math.ceil(lock.ttlSeconds / 60)} min if this is a new one.` },
      { status: 409, headers: cors },
    )
  }

  const report = await reconcileBeforeSend()
  if (report.recipients === 0) {
    return NextResponse.json({ message: 'Nobody is subscribed yet.', report }, { status: 409, headers: cors })
  }

  const { html, text } = renderIssue(draft, items, {
    unsubscribeUrl: RESEND_UNSUBSCRIBE_PLACEHOLDER,
    postalAddress: settings.postalAddress,
  })
  const broadcast = await createAndSendBroadcast(settings.apiKey, {
    segmentId: settings.segmentId,
    from: settings.from,
    subject: draft.subject,
    name: `Newsletter: ${draft.subject}`,
    html,
    text,
  })
  logger.info('[newsletter] issue sent', { broadcastId: broadcast.id, recipients: report.recipients, items: items.length })
  return NextResponse.json({ broadcastId: broadcast.id, report }, { headers: cors })
}
