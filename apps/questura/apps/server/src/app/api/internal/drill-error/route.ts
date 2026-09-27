import { NextRequest, NextResponse } from 'next/server'

import { internalSecretMatches } from '@/shared/http/internal-secret'
import { logger } from '@/shared/utils/logger'

/**
 * POST /api/internal/drill-error?kind=thrown|logged
 *
 * The ops drill's forced API error (launch fix plan PL4): proof on the live
 * API that its errors reach Sentry and the owner's phone, without breaking
 * anything a reader uses. Each kind takes one of the two roads a real error
 * takes:
 *
 * - `thrown`: an error escapes the route, so Next's `onRequestError` reports
 *   it (`reportRequestError`) and the caller gets Next's own 500.
 * - `logged`: the route catches it, logs it and answers 500 itself, the way
 *   most failure paths do; `logger.error` reports it
 *   (`shared/observability/logged-error-report.ts`, phase 3B).
 *
 * Gated by the ops secret the other internal routes use (`DB_STATS_SECRET`):
 * every accepted call spends Sentry quota and sends the owner an email.
 * Messages start with `DRILL` so an issue is never mistaken for a real one.
 */
export const dynamic = 'force-dynamic'

class DrillError extends Error {
  constructor(kind: string) {
    super(`DRILL: forced API error (${kind}); safe to resolve`)
    this.name = 'DrillError'
  }
}

const noStore = { 'Cache-Control': 'no-store' }

export async function POST(req: NextRequest) {
  const configured = process.env.DB_STATS_SECRET?.trim()
  if (!configured) {
    return NextResponse.json({ message: 'DB_STATS_SECRET is not configured.' }, { status: 503, headers: noStore })
  }
  if (!internalSecretMatches(req, configured)) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401, headers: noStore })
  }

  const kind = req.nextUrl.searchParams.get('kind')

  if (kind === 'thrown') {
    throw new DrillError('thrown out of the route')
  }

  if (kind === 'logged') {
    logger.error('DRILL: forced API error, caught and logged', { error: new DrillError('caught and logged') })
    return NextResponse.json({ message: 'Drill error logged.' }, { status: 500, headers: noStore })
  }

  return NextResponse.json({ message: 'kind must be "thrown" or "logged".' }, { status: 400, headers: noStore })
}
