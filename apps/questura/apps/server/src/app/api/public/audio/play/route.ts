import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { forbiddenOriginResponse, getPrivateCorsHeaders, handleCorsOptions } from '@/shared/utils/cors'
import { requireVisitorPrincipal } from '@/features/visitor-auth/lib/current-principal'
import { runPrivateWork } from '@/features/visitor-auth/lib/private-route'
import { hasVisitorSessionCookie } from '@/features/visitor-auth/lib/session-cookie'
import { parseSentences } from '@/features/audio-clips/lib/public-audio'
import { audioStorageConfig, signAudioUrl } from '@/features/audio-clips/lib/storage'
import { logger } from '@/shared/utils/logger'

/**
 * GET /api/public/audio/play?clip=12
 *
 * What a member's player needs to play one AudioClip (ADR-0018): a link to
 * the file that expires in 15 minutes, and the sentences with their times for
 * the highlight. Like the paid body (`/api/public/articles/full`), it depends
 * on who is asking, so it is never cached, and a reader without Membership
 * entitlement gets nothing but the refusal: the sentences are the article's
 * words, and the file is the paid feature.
 */
export const dynamic = 'force-dynamic'

const TTL_SECONDS = 15 * 60

function fail(corsHeaders: Record<string, string>, message: string, status: number) {
  return NextResponse.json({ message }, { status, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } })
}

export async function GET(req: NextRequest) {
  const corsHeaders = getPrivateCorsHeaders(req)
  const blocked = forbiddenOriginResponse(req, corsHeaders)
  if (blocked) return blocked
  if (!hasVisitorSessionCookie(req.headers)) return fail(corsHeaders, 'Authentication required', 401)

  return runPrivateWork(
    { headers: req.headers, signal: req.signal, corsHeaders, route: '/api/public/audio/play' },
    () => play(req, corsHeaders),
  )
}

async function play(req: NextRequest, corsHeaders: Record<string, string>) {
  const clipId = Number(req.nextUrl.searchParams.get('clip'))
  if (!Number.isInteger(clipId) || clipId <= 0) return fail(corsHeaders, 'clip must be a positive integer', 400)

  const auth = await requireVisitorPrincipal(req.headers, { freshSession: true })
  if (auth.error || !auth.principal) return fail(corsHeaders, auth.error ?? 'Authentication required', auth.status)
  if (!auth.principal.membership.active) return fail(corsHeaders, 'Membership required', 403)
  if (!audioStorageConfig()) return fail(corsHeaders, 'Audio is not available right now.', 503)

  try {
    const payload = await getPayload({ config })
    const clip = (await payload
      .findByID({ collection: 'audio-clips', id: clipId, depth: 0, overrideAccess: true })
      .catch(() => null)) as unknown as {
      id: number
      articleId: number
      sectionKey: string
      durationSeconds: number
      sentences: unknown
      storageKey: string
    } | null
    if (!clip) return fail(corsHeaders, 'Clip not found.', 404)

    const article = (await payload
      .findByID({ collection: 'articles', id: clip.articleId, depth: 0, overrideAccess: true, select: { status: true } })
      .catch(() => null)) as { status?: string } | null
    if (article?.status !== 'published') return fail(corsHeaders, 'Clip not found.', 404)

    const signed = signAudioUrl(clip.storageKey, TTL_SECONDS)
    return NextResponse.json(
      {
        clipId: clip.id,
        url: signed.url,
        expiresAt: signed.expiresAt,
        durationSeconds: clip.durationSeconds,
        sentences: parseSentences(clip.sentences) ?? [],
      },
      { headers: { ...corsHeaders, 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    logger.error('[audio] play failed', { clipId, error: error instanceof Error ? error.message : String(error) })
    return fail(corsHeaders, 'Could not load the audio.', 500)
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req)
}
