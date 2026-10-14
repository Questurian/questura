import { NextRequest } from 'next/server'

import { sendIssue, withAdmin } from '@/features/newsletter/lib/admin'
import { handleCorsOptions } from '@/shared/utils/cors'

// POST /api/newsletter/admin/send { subject, note, items }: reconcile the list
// with Resend, then send the issue to every confirmed subscriber.
export async function POST(req: NextRequest) {
  return withAdmin(req, ({ user, cors }) => sendIssue(req, user, cors))
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req)
}
