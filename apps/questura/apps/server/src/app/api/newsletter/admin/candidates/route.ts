import { NextRequest, NextResponse } from 'next/server'

import { candidates, withAdmin } from '@/features/newsletter/lib/admin'
import { handleCorsOptions } from '@/shared/utils/cors'

// GET /api/newsletter/admin/candidates?since=ISO: pieces published since the
// last issue (or `since`), for the composer to pick from.
export async function GET(req: NextRequest) {
  return withAdmin(req, async ({ cors }) =>
    NextResponse.json(await candidates(req.nextUrl.searchParams.get('since')), { headers: cors }),
  )
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req)
}
