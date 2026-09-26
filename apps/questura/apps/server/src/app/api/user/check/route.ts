import { NextRequest } from 'next/server'

import { checkAccountCheckRateLimit } from '@/features/visitor-auth/lib/account-check-rate-limit'
import {
  assertValidEmail,
  checkVisitorAccount,
} from '@/features/visitor-auth/lib/legacy-auth-compat'
import { corsResponse, handleCorsOptions } from '@/shared/utils/cors'

export async function POST(req: NextRequest) {
  // A body that is not a JSON object is the caller's mistake, not ours: it
  // used to fall into the 500 branch below and read as a server failure.
  const body: unknown = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return corsResponse({ success: false, message: 'Request body must be a JSON object' }, req, 400)
  }

  try {
    const { email } = body as { email?: unknown }
    const normalizedEmail = assertValidEmail(email)
    const rateLimit = await checkAccountCheckRateLimit(req, normalizedEmail)

    if (!rateLimit.allowed) {
      const response = corsResponse(
        { success: false, message: 'Too many account checks. Please try again shortly.' },
        req,
        429
      )
      response.headers.set('Retry-After', String(rateLimit.retryAfterSeconds))
      return response
    }

    const result = await checkVisitorAccount(normalizedEmail)
    return corsResponse(result, req)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : ''
    const isValidationError =
      errorMessage.includes('valid email') || errorMessage.includes('Email is required')

    return corsResponse(
      {
        success: false,
        message: isValidationError ? errorMessage : 'Failed to check user',
      },
      req,
      isValidationError ? 400 : 500
    )
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req)
}
