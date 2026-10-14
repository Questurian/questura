/**
 * Newsletter signup: anonymous, double opt-in.
 *
 * Records the address as `pending` and mails a confirmation link; nothing
 * else is ever sent until that link is clicked (`/api/newsletter/confirm`).
 *
 * The answer never says whether an address is already on the list: a new
 * signup, a repeat, a subscriber and a suppressed address all get the same
 * 202. Only "you typed something that is not an email" and "we cannot send
 * right now" are told apart, because the reader can act on both.
 *
 * `website` is a honeypot: a field the real form hides from people. A bot
 * that fills every input gets the same 202 and no row, no mail.
 */

import { NextRequest, NextResponse } from 'next/server'

import { parseNewsletterEmail } from '@/features/newsletter/lib/email-address'
import { isNewsletterSignupSource } from '@/features/newsletter/lib/constants'
import { checkSignupCallerLimit } from '@/features/newsletter/lib/rate-limit'
import { subscribe } from '@/features/newsletter/lib/service'
import { temporarilyUnavailable, tooManyRequests } from '@/features/visitor-auth/lib/private-route'
import { logger } from '@/shared/utils/logger'
import { forbiddenOriginResponse, getCorsHeaders, handleCorsOptions } from '@/shared/utils/cors'

const MAX_BODY_BYTES = 2048

function accepted(corsHeaders: Record<string, string>) {
  return NextResponse.json({ ok: true }, { status: 202, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } })
}

function badRequest(corsHeaders: Record<string, string>, error: string) {
  return NextResponse.json({ error }, { status: 400, headers: corsHeaders })
}

function cannotSendNow(corsHeaders: Record<string, string>, retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'We cannot send confirmation emails right now. Please try again later.' },
    {
      status: 503,
      headers: { ...corsHeaders, 'Retry-After': String(Math.max(1, retryAfterSeconds)), 'Cache-Control': 'no-store' },
    },
  )
}

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req)
  const forbidden = forbiddenOriginResponse(req, corsHeaders)
  if (forbidden) return forbidden

  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413, headers: corsHeaders })
  }

  const limit = await checkSignupCallerLimit(req.headers)
  if (!limit.allowed) {
    return limit.unavailable
      ? temporarilyUnavailable(corsHeaders, 'counter-unavailable', limit.retryAfterSeconds)
      : tooManyRequests(corsHeaders, limit.retryAfterSeconds, 'newsletter-signup')
  }

  let body: { email?: unknown; source?: unknown; website?: unknown }
  try {
    const raw = await req.text()
    if (raw.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 413, headers: corsHeaders })
    body = JSON.parse(raw)
  } catch {
    return badRequest(corsHeaders, 'Invalid request.')
  }
  if (!body || typeof body !== 'object') return badRequest(corsHeaders, 'Invalid request.')

  if (typeof body.website === 'string' && body.website.trim() !== '') return accepted(corsHeaders)

  const email = parseNewsletterEmail(body.email)
  if (!email) return badRequest(corsHeaders, 'Please enter a valid email address.')
  if (!isNewsletterSignupSource(body.source)) return badRequest(corsHeaders, 'Invalid request.')

  try {
    const result = await subscribe({ email, source: body.source, headers: req.headers })
    switch (result.outcome) {
      case 'confirmation-sent':
      case 'nothing-to-send':
        return accepted(corsHeaders)
      case 'busy':
        return result.unavailable
          ? temporarilyUnavailable(corsHeaders, 'counter-unavailable', result.retryAfterSeconds)
          : cannotSendNow(corsHeaders, result.retryAfterSeconds)
      case 'send-failed':
        return cannotSendNow(corsHeaders, 60)
    }
  } catch (error) {
    logger.error('[newsletter] signup failed', { error })
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500, headers: corsHeaders })
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req)
}
