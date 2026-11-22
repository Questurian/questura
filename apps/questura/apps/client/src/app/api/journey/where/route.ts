import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextRequest, NextResponse } from 'next/server'

import { whereFor, type Connection } from '@/lib/journey/eligibility'

/**
 * GET /api/journey/where (ADR-0020): may this browser be recorded, and from
 * roughly where. Cloudflare's own reading of the connection; the address is
 * not read. Off Cloudflare (next dev, the CI sandbox) the answer is no.
 */
export const dynamic = 'force-dynamic'

export function GET(req: NextRequest) {
  let connection: Connection | undefined
  try {
    connection = getCloudflareContext().cf as Connection | undefined
  } catch {
    connection = undefined
  }
  return NextResponse.json(whereFor(connection, req.headers), {
    headers: { 'cache-control': 'private, no-store, max-age=0' },
  })
}
