import { NextRequest, NextResponse } from 'next/server'

import {
  authenticateRequest,
  getCorsHeaders,
  handleCorsOptions,
} from '@/features/auth/lib/auth-middleware'
import {
  curatedPageFromSearchParams,
  publishMainHomepage,
} from '@/features/homepage-featured-content'
import { getErrorMessage } from '@/shared/utils/api-response'

export async function POST(req: NextRequest) {
  const headers = getCorsHeaders(req)
  try {
    const authResult = await authenticateRequest(req, {
      requireAuth: true,
      allowedRoles: ['admin', 'editor'],
    })
    if (authResult.error) {
      return NextResponse.json({ message: authResult.error }, { status: authResult.status, headers })
    }

    const page = curatedPageFromSearchParams(new URL(req.url).searchParams)
    if (!page) return NextResponse.json({ message: 'Unknown page.' }, { status: 400, headers })
    const result = await publishMainHomepage(authResult.user?.id ?? null, page)
    return NextResponse.json(result.body, { status: result.status, headers })
  } catch (error) {
    return NextResponse.json(
      { message: getErrorMessage(error, 'Failed to publish main homepage.') },
      { status: 400, headers },
    )
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req)
}
