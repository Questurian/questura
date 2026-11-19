import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { authenticateRequest } from '@/features/auth/lib/auth-middleware'
import { staffUser } from '@/features/auth/lib/staff-user'
import { listenStatsForArticle } from '@/features/audio-clips/lib/listens'
import { studioAudioView } from '@/features/audio-clips/lib/service'
import { audioStorageConfig, signAudioUrl } from '@/features/audio-clips/lib/storage'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

/**
 * GET /api/audio-clips/studio?articleId=54
 *
 * Everything the AI Blog Writer's Audio tab draws (ADR-0018): each section
 * with the exact words the Narrator would read and its clip's state
 * (current, out of date), clips whose heading is gone, a signed link to
 * listen to each clip, and the Listens numbers. Editors and admins only:
 * the Listens name members.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req, { requireAuth: true })
  const staff = staffUser(auth.user)
  if (auth.error || !staff) {
    return NextResponse.json({ message: auth.error ?? 'Authentication required' }, { status: auth.status === 200 ? 403 : auth.status })
  }
  if (staff.role !== 'admin' && staff.role !== 'editor') {
    return NextResponse.json({ message: 'Editor or admin role required' }, { status: 403 })
  }

  const articleId = Number(req.nextUrl.searchParams.get('articleId'))
  if (!Number.isInteger(articleId) || articleId <= 0) {
    return NextResponse.json({ message: 'articleId must be a positive integer' }, { status: 400 })
  }

  const payload = await getPayload({ config })
  const view = await studioAudioView(payload, articleId)
  if (!view) return NextResponse.json({ message: 'Article not found.' }, { status: 404 })

  const storageReady = Boolean(audioStorageConfig())
  const clipRows = await payload.find({
    collection: 'audio-clips',
    where: { articleId: { equals: articleId } },
    limit: 200,
    depth: 0,
    overrideAccess: true,
    select: { storageKey: true },
  })
  const listenUrls: Record<string, string> = {}
  if (storageReady) {
    for (const doc of clipRows.docs as unknown as Array<{ id: number; storageKey: string }>) {
      listenUrls[String(doc.id)] = signAudioUrl(doc.storageKey, 60 * 60).url
    }
  }

  const stats = await listenStatsForArticle(payload, articleId)
  return NextResponse.json({ ...view, storageReady, listenUrls, stats }, { headers: NO_STORE })
}
