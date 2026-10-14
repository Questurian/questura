import { NextRequest } from 'next/server'

import { sendTest, withAdmin } from '@/features/newsletter/lib/admin'
import { handleCorsOptions } from '@/shared/utils/cors'

// POST /api/newsletter/admin/test { subject, note, items }: one copy to the signed-in admin.
export async function POST(req: NextRequest) {
  return withAdmin(req, ({ user, cors }) => sendTest(req, user, cors))
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req)
}
