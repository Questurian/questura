import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { forbiddenOriginResponse, getPrivateCorsHeaders, handleCorsOptions } from '@/shared/utils/cors'
import { requireVisitorPrincipal } from '@/features/visitor-auth/lib/current-principal'
import { runPrivateWork, temporarilyUnavailable, tooManyRequests } from '@/features/visitor-auth/lib/private-route'
import { hasVisitorSessionCookie } from '@/features/visitor-auth/lib/session-cookie'
import { isStaffEmail } from '@/features/visitor-auth/lib/staff-email-guard'
import { normalizeRanges, recordListen } from '@/features/audio-clips/lib/listens'
import { getClientIp, hashIdentifier, incrementCounter } from '@/shared/lib/rate-limit-counter'
import { logger } from '@/shared/utils/logger'

/**
 * POST /api/public/audio/listens
 *
 * The player's report on one Listen (ADR-0018): sent every 15 seconds while
 * it plays, on pause, at the end and when the page closes. Body (JSON, sent
 * as text/plain so a closing page can send it without a preflight):
 *
 *   { listenId, clipId, secondsHeard, ranges: [[from, to], ...], speeds: [1, 1.5], finished }
 *
 * Members only, like playing. A Listen belongs to the account that started
 * it; a report for someone else's Listen is ignored.
 */
export const dynamic = 'force-dynamic'

const WINDOW_SECONDS = 60
const MAX_REPORTS_PER_ACCOUNT = 120
const LISTEN_ID = /^[a-zA-Z0-9-]{8,64}$/

function answer(corsHeaders: Record<string, string>, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  const corsHeaders = getPrivateCorsHeaders(req)
  const blocked = forbiddenOriginResponse(req, corsHeaders)
  if (blocked) return blocked
  if (!hasVisitorSessionCookie(req.headers)) return answer(corsHeaders, { message: 'Authentication required' }, 401)

  return runPrivateWork(
    { headers: req.headers, signal: req.signal, corsHeaders, route: 'POST /api/public/audio/listens' },
    () => report(req, corsHeaders),
  )
}

async function report(req: NextRequest, corsHeaders: Record<string, string>) {
  const auth = await requireVisitorPrincipal(req.headers)
  if (auth.error || !auth.principal) return answer(corsHeaders, { message: auth.error ?? 'Authentication required' }, auth.status)
  if (!auth.principal.membership.active) return answer(corsHeaders, { message: 'Membership required' }, 403)

  try {
    const counter = await incrementCounter(
      `audio:listens:rate-limit:user:${hashIdentifier(auth.principal.id)}`,
      WINDOW_SECONDS,
    )
    if (counter.count > MAX_REPORTS_PER_ACCOUNT) return tooManyRequests(corsHeaders, counter.ttlSeconds, 'account')
  } catch (error) {
    logger.error('[audio] listen rate limit unavailable; denying', {
      ipHash: hashIdentifier(getClientIp(req.headers)),
      error,
    })
    return temporarilyUnavailable(corsHeaders, 'counter-unavailable', 5)
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(await req.text()) as Record<string, unknown>
  } catch {
    return answer(corsHeaders, { message: 'JSON body required' }, 400)
  }

  const listenId = typeof body.listenId === 'string' ? body.listenId : ''
  const clipId = Number(body.clipId)
  const secondsHeard = Number(body.secondsHeard)
  if (!LISTEN_ID.test(listenId)) return answer(corsHeaders, { message: 'listenId invalid' }, 400)
  if (!Number.isInteger(clipId) || clipId <= 0) return answer(corsHeaders, { message: 'clipId invalid' }, 400)
  if (!Number.isFinite(secondsHeard) || secondsHeard < 0) return answer(corsHeaders, { message: 'secondsHeard invalid' }, 400)

  const payload = await getPayload({ config })
  const clip = (await payload
    .findByID({ collection: 'audio-clips', id: clipId, depth: 0, overrideAccess: true })
    .catch(() => null)) as unknown as { id: number; articleId: number; sectionKey: string; durationSeconds: number } | null
  if (!clip) return answer(corsHeaders, { message: 'Clip not found.' }, 404)

  const ranges = normalizeRanges(body.ranges ?? [], clip.durationSeconds)
  if (!ranges) return answer(corsHeaders, { message: 'ranges invalid' }, 400)
  const speeds = (Array.isArray(body.speeds) ? body.speeds : [])
    .map(Number)
    .filter((speed) => [0.75, 1, 1.25, 1.5, 2].includes(speed))

  const result = await recordListen(payload, {
    listenId,
    authUserId: auth.principal.id,
    isStaff: await isStaffEmail(auth.principal.email).catch(() => false),
    clip,
    secondsHeard,
    ranges,
    speeds,
    finished: body.finished === true,
  })
  if (result === 'not-yours') return answer(corsHeaders, { message: 'Listen not found.' }, 404)
  return answer(corsHeaders, { ok: true }, result === 'created' ? 201 : 200)
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req)
}
