import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { authenticateRequest } from '@/features/auth/lib/auth-middleware'
import { serializeArticleByCollection } from '@/features/articles/public/serializeArticleBlocks'
import { populateDraftArticle } from '@/features/articles/studio-preview/populateDraftArticle'
import { teaserPointsFor } from '@/features/articles/studio-preview/teaserPoints'
import { logger } from '@/shared/utils/logger'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

/**
 * POST /api/studio-preview
 *
 * Turns an itinerary or listicle the AI Blog Writer is still editing into what the public
 * article route would answer for it, so the studio's preview draws the real
 * page. Reads only: nothing here is saved, and the document does not need to
 * exist yet. Staff only, because it answers without the paywall.
 *
 * With `teaserPoints: true` it also answers the dots a non-member's map would
 * draw (`teaserPoints`), for framing the guide's saved map picture.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req, { requireAuth: true })
  if (auth.error || !auth.user) {
    return NextResponse.json({ message: auth.error ?? 'Authentication required' }, { status: auth.status })
  }

  const body = (await req.json().catch(() => null)) as { doc?: unknown; teaserPoints?: unknown } | null
  if (!body || typeof body.doc !== 'object' || body.doc === null || Array.isArray(body.doc)) {
    return NextResponse.json({ message: 'doc required' }, { status: 400 })
  }

  try {
    const payload = await getPayload({ config })
    const doc = await populateDraftArticle(body.doc as Record<string, unknown>, payload)
    const collection = doc.articleType === 'single-type-listicle' ? 'single-type-listicles' : 'listicle-itineraries'
    await serializeArticleByCollection(collection, doc, payload)
    if (body.teaserPoints === true) {
      return NextResponse.json({ ...doc, teaserPoints: teaserPointsFor(collection, doc) }, { headers: NO_STORE })
    }
    return NextResponse.json(doc, { headers: NO_STORE })
  } catch (error) {
    logger.error('Failed to build studio preview', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ message: 'Could not build the preview.' }, { status: 500, headers: NO_STORE })
  }
}
