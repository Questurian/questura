import { NextRequest, NextResponse } from 'next/server'
import { forbiddenOriginResponse, getPrivateCorsHeaders, handleCorsOptions } from '@/shared/utils/cors'
import { requireVisitorPrincipal } from '@/features/visitor-auth/lib/current-principal'
import { confirmCheckoutForVisitor, isCheckoutSessionId } from '@/payments/lib/confirm-checkout'
import { checkPaymentsRateLimit, checkPaymentsVisitorRateLimit, paymentsRateLimitResponse } from '@/payments/lib/payments-rate-limit'
import { logger } from '@/shared/utils/logger'

/**
 * The success page's "I just paid on this session": sync the visitor's
 * membership from Stripe now rather than whenever the webhook arrives. See
 * `confirm-checkout.ts` for why this is safe to run alongside the webhook.
 *
 * Every answer is advisory to the page, which keeps polling `/api/me` either
 * way. A failure here costs the buyer nothing they did not already have.
 */
export async function POST(req: NextRequest) {
  // The body says whether this visitor has just become a member.
  const corsHeaders = getPrivateCorsHeaders(req)
  const blocked = forbiddenOriginResponse(req, corsHeaders)
  if (blocked) return blocked

  const rateLimit = await checkPaymentsRateLimit(req.headers, 'confirm')
  if (!rateLimit.allowed) {
    return paymentsRateLimitResponse(corsHeaders, rateLimit.retryAfterSeconds)
  }

  try {
    const authResult = await requireVisitorPrincipal(req.headers, { freshSession: true })

    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status, headers: corsHeaders }
      )
    }

    const visitorAuthUserId = String(authResult.principal!.id)
    const visitorLimit = await checkPaymentsVisitorRateLimit(visitorAuthUserId, 'confirm')
    if (!visitorLimit.allowed) {
      return paymentsRateLimitResponse(corsHeaders, visitorLimit.retryAfterSeconds)
    }

    let body: { sessionId?: unknown } = {}
    try {
      body = await req.json()
    } catch {
      // Answered below as a missing id.
    }

    const sessionId = body?.sessionId

    if (!isCheckoutSessionId(sessionId)) {
      return NextResponse.json(
        { error: 'A checkout session id is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const result = await confirmCheckoutForVisitor(visitorAuthUserId, sessionId)

    switch (result.outcome) {
      case 'not_found':
        return NextResponse.json(
          { error: 'Checkout session not found' },
          { status: 404, headers: corsHeaders }
        )
      case 'not_complete':
        return NextResponse.json(
          { status: 'pending', membershipActive: false },
          { headers: corsHeaders }
        )
      default:
        return NextResponse.json(
          { status: 'confirmed', membershipActive: result.membershipActive },
          { headers: corsHeaders }
        )
    }
  } catch (error) {
    logger.error('Error confirming checkout session', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Could not confirm the checkout yet' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req)
}
