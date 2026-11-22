import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { clientKind, isAutomated } from '@/features/reader-journeys/client-kind'
import { MAX_REPORT_BYTES, parseJourneyBody } from '@/features/reader-journeys/report'
import { forgetViewer, journeyPool, recordJourney } from '@/features/reader-journeys/store'
import { lookupVisitorSession } from '@/features/visitor-auth/lib/current-principal'
import { hasVisitorSessionCookie } from '@/features/visitor-auth/lib/session-cookie'
import { getClientIp, hashIdentifier, incrementCounters } from '@/shared/lib/rate-limit-counter'
import { forbiddenOriginResponse, getPrivateCorsHeaders, handleCorsOptions } from '@/shared/utils/cors'
import { logger } from '@/shared/utils/logger'

/**
 * POST /api/public/journeys (ADR-0019)
 *
 * A US reader's browser reporting one page view so far, or `{ forget: id }`
 * from the privacy page's off switch. Sent as text/plain so a closing page
 * can send it without a preflight.
 *
 * Passive: whatever goes wrong the answer is an empty 204 and the page never
 * notices. The exceptions are a bad request, and a deletion that failed,
 * because the privacy page must not say "deleted" when it was not.
 *
 * The address is used only for the rate limits (hashed, gone within a day). It is never
 * written with a journey and neither is the user agent.
 */
export const dynamic = 'force-dynamic'

const WINDOW_SECONDS = 60
const DAY_SECONDS = 24 * 60 * 60
/** Phones share carrier addresses, so this is well above one reader's 20 a minute at most. */
export const MAX_PER_ADDRESS = 400
export const MAX_TOTAL = 3000
/** A day's ceilings, so a flood cannot fill the database. */
export const MAX_PER_ADDRESS_DAY = 10_000
export const MAX_TOTAL_DAY = 200_000
/** Reports being written at once; the rest are dropped, never queued on the pool. */
export const MAX_WRITING = 4

let writing = 0

export async function POST(req: NextRequest) {
  const headers = getPrivateCorsHeaders(req)
  const blocked = forbiddenOriginResponse(req, headers)
  if (blocked) return blocked

  const answer = (status = 204) => new NextResponse(null, { status, headers })

  if (Number(req.headers.get('content-length') ?? 0) > MAX_REPORT_BYTES) return answer(413)
  const body = parseJourneyBody(await req.text())
  if (!body) return answer(400)
  const forgetting = 'forget' in body

  const userAgent = req.headers.get('user-agent') ?? ''
  if (!forgetting) {
    if (req.headers.get('sec-gpc') === '1' || req.headers.get('dnt') === '1') return answer()
    // Cloudflare writes this one itself. The website only starts recording for
    // US readers; this is the second look.
    const country = req.headers.get('cf-ipcountry')
    if (country && country !== 'US') return answer()
    if (isAutomated(userAgent)) return answer()
    // A browser signed in to the studio is staff at work, not a reader.
    if (/(?:^|;\s*)payload-token=/.test(req.headers.get('cookie') ?? '')) return answer()
  }

  try {
    // Deletions have counters of their own, so a flood of reports cannot block one.
    const scope = forgetting ? 'journeys:forget' : 'journeys'
    const addressHash = hashIdentifier(getClientIp(req.headers))
    const [address, total] = await incrementCounters([`${scope}:ip:${addressHash}`, `${scope}:all`], WINDOW_SECONDS)
    if (address.count > MAX_PER_ADDRESS || total.count > MAX_TOTAL) return answer(forgetting ? 429 : 204)
    if (!forgetting) {
      const [addressDay, totalDay] = await incrementCounters(
        [`${scope}:day:ip:${addressHash}`, `${scope}:day:all`],
        DAY_SECONDS,
      )
      if (addressDay.count > MAX_PER_ADDRESS_DAY || totalDay.count > MAX_TOTAL_DAY) return answer()
    }
  } catch {
    return answer(forgetting ? 503 : 204)
  }

  if (!forgetting && writing >= MAX_WRITING) return answer()
  writing += 1
  try {
    const pool = journeyPool(await getPayload({ config }))
    if ('forget' in body) {
      await forgetViewer(pool, body.forget)
    } else {
      const session = hasVisitorSessionCookie(req.headers)
        ? await lookupVisitorSession(req.headers).catch(() => null)
        : null
      await recordJourney(pool, body.report, clientKind(userAgent), session?.user?.id ?? null)
    }
    return answer()
  } catch (error) {
    // The code only: a driver's message can carry the values.
    logger.warn('[journeys] write failed', { code: (error as { code?: string }).code ?? 'unknown' })
    return answer(forgetting ? 503 : 204)
  } finally {
    writing -= 1
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req)
}
