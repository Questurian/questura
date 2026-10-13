import { NextRequest } from 'next/server'

import { preview, withAdmin } from '@/features/newsletter/lib/admin'
import { handleCorsOptions } from '@/shared/utils/cors'

// POST /api/newsletter/admin/preview { subject, note, items }: the issue's HTML.
export async function POST(req: NextRequest) {
  return withAdmin(req, ({ cors }) => preview(req, cors))
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req)
}
