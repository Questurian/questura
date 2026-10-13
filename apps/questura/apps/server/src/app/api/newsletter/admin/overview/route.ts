import { NextRequest, NextResponse } from 'next/server'

import { overview, withAdmin } from '@/features/newsletter/lib/admin'
import { handleCorsOptions } from '@/shared/utils/cors'

// GET /api/newsletter/admin/overview: list counts, missing settings, last issue.
export async function GET(req: NextRequest) {
  return withAdmin(req, async ({ cors }) => NextResponse.json(await overview(), { headers: cors }))
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req)
}
