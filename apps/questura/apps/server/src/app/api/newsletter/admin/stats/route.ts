import { NextRequest, NextResponse } from 'next/server'

import { stats, withAdmin } from '@/features/newsletter/lib/admin'
import { handleCorsOptions } from '@/shared/utils/cors'

// GET /api/newsletter/admin/stats: weekly confirmations, signups by form,
// confirm rate and what followed each issue. Counted from the site's list.
export async function GET(req: NextRequest) {
  return withAdmin(req, async ({ cors }) => NextResponse.json(await stats(), { headers: cors }))
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req)
}
