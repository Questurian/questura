/**
 * Newsletter confirmation: the second half of double opt-in.
 *
 * The emailed link opens a website page (`/newsletters/confirm?token=...`)
 * and the reader's click on that page POSTs the token here. The link itself
 * changes nothing: mail scanners open every link in a message, and a GET that
 * confirmed would let a scanner subscribe an inbox nobody is reading.
 *
 * Answers 200 with `status`: `confirmed` (also for a repeat click),
 * `expired` (sign up again for a new link) or `invalid`.
 */

import { NextRequest, NextResponse } from 'next/server'

import { checkConfirmCallerLimit } from '@/features/newsletter/lib/rate-limit'
import { confirm, isWellFormedConfirmToken } from '@/features/newsletter/lib/service'
import { temporarilyUnavailable, tooManyRequests } from '@/features/visitor-auth/lib/private-route'
import { logger } from '@/shared/utils/logger'
import { forbiddenOriginResponse, getCorsHeaders, handleCorsOptions } from '@/shared/utils/cors'

const MAX_BODY_BYTES = 512

function answer(corsHeaders: Record<string, string>, status: 'confirmed' | 'expired' | 'invalid') {
  return NextResponse.json({ status }, { status: 200, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req)
  const forbidden = forbiddenOriginResponse(req, corsHeaders)
  if (forbidden) return forbidden

  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413, headers: corsHeaders })
  }

  const limit = await checkConfirmCallerLimit(req.headers)
  if (!limit.allowed) {
    return limit.unavailable
      ? temporarilyUnavailable(corsHeaders, 'counter-unavailable', limit.retryAfterSeconds)
      : tooManyRequests(corsHeaders, limit.retryAfterSeconds, 'newsletter-confirm')
  }

  let token: unknown
  try {
    const raw = await req.text()
    if (raw.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 413, headers: corsHeaders })
    token = (JSON.parse(raw) as { token?: unknown } | null)?.token
  } catch {
    return answer(corsHeaders, 'invalid')
  }
  if (!isWellFormedConfirmToken(token)) return answer(corsHeaders, 'invalid')

  try {
    return answer(corsHeaders, await confirm(token))
  } catch (error) {
    logger.error('[newsletter] confirm failed', { error })
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500, headers: corsHeaders })
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req)
}
