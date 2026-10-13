import { NextRequest, NextResponse } from 'next/server'

import { requireCurrentPrincipal } from '@/features/visitor-auth/lib/current-principal'
import { runPrivateWork, temporarilyUnavailable, tooManyRequests } from '@/features/visitor-auth/lib/private-route'
import { hasVisitorSessionCookie } from '@/features/visitor-auth/lib/session-cookie'
import { checkSignupCallerLimit } from '@/features/newsletter/lib/rate-limit'
import { accountStatus, accountSubscribe, unsubscribe } from '@/features/newsletter/lib/service'
import { normalizeEmail } from '@/shared/lib/normalize-email'
import { forbiddenOriginResponse, getPrivateCorsHeaders, handleCorsOptions } from '@/shared/utils/cors'

/**
 * The account page's newsletter switch, for the signed-in Visitor's own
 * address. Nobody is put on the list for having an account: the switch
 * starts off and only this route turns it on (decision 2026-10-13).
 *
 * GET answers `{ status: 'subscribed' | 'pending' | 'not-subscribed' }`.
 * PUT `{ subscribed: boolean }` answers the new status. Turning it on with an
 * unverified email mails the usual confirmation and answers `pending`.
 */

function signedOut(corsHeaders: Record<string, string>, message = 'Authentication required') {
  return NextResponse.json({ error: message }, { status: 401, headers: corsHeaders })
}

export async function GET(req: NextRequest) {
  const corsHeaders = getPrivateCorsHeaders(req)
  const blocked = forbiddenOriginResponse(req, corsHeaders)
  if (blocked) return blocked
  if (!hasVisitorSessionCookie(req.headers)) return signedOut(corsHeaders)

  return runPrivateWork({ headers: req.headers, signal: req.signal, corsHeaders, route: 'GET /api/account/newsletter' }, async () => {
    const auth = await requireCurrentPrincipal(req.headers)
    if (auth.error || !auth.principal) return signedOut(corsHeaders, auth.error ?? undefined)
    const status = await accountStatus(normalizeEmail(auth.principal.email))
    return NextResponse.json({ status }, { headers: { ...corsHeaders, 'Cache-Control': 'no-store' } })
  })
}

export async function PUT(req: NextRequest) {
  const corsHeaders = getPrivateCorsHeaders(req)
  const blocked = forbiddenOriginResponse(req, corsHeaders)
  if (blocked) return blocked
  if (!hasVisitorSessionCookie(req.headers)) return signedOut(corsHeaders)

  return runPrivateWork({ headers: req.headers, signal: req.signal, corsHeaders, route: 'PUT /api/account/newsletter' }, async () => {
    const auth = await requireCurrentPrincipal(req.headers)
    if (auth.error || !auth.principal) return signedOut(corsHeaders, auth.error ?? undefined)

    const limit = await checkSignupCallerLimit(req.headers)
    if (!limit.allowed) {
      return limit.unavailable
        ? temporarilyUnavailable(corsHeaders, 'counter-unavailable', limit.retryAfterSeconds)
        : tooManyRequests(corsHeaders, limit.retryAfterSeconds, 'newsletter-account')
    }

    let body: { subscribed?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: corsHeaders })
    }
    if (typeof body?.subscribed !== 'boolean') {
      return NextResponse.json({ error: 'subscribed must be true or false.' }, { status: 400, headers: corsHeaders })
    }

    const email = normalizeEmail(auth.principal.email)
    if (!body.subscribed) {
      await unsubscribe(email, 'site')
    } else {
      const result = await accountSubscribe({ email, emailVerified: auth.principal.emailVerified, headers: req.headers })
      if (result.outcome === 'busy' || result.outcome === 'send-failed') {
        return NextResponse.json(
          { error: 'We cannot send the confirmation email right now. Please try again later.' },
          { status: 503, headers: { ...corsHeaders, 'Retry-After': '60' } },
        )
      }
    }
    const status = await accountStatus(email)
    return NextResponse.json({ status }, { headers: { ...corsHeaders, 'Cache-Control': 'no-store' } })
  })
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req)
}
