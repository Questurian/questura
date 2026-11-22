import { createHash, timingSafeEqual } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'
import { getPayload, type Where } from 'payload'

import config from '@/payload.config'
import { buildCrawlerBody } from '@/features/articles/public/crawlerBody'
import {
  serializeArticleByCollection,
  type ArticleCollectionSlug,
} from '@/features/articles/public/serializeArticleBlocks'
import { isGatedItem } from '@/shared/content/accessTier'
import { AdmissionRefused } from '@/shared/http/admission'
import { admitPublicWork, overloadedResponse } from '@/shared/http/public-read'
import { DEFAULT_LANG } from '@/shared/i18n/languageField'
import { logger } from '@/shared/utils/logger'

/**
 * The paid body for Google's full-text view (ADR-0009, revised 2026-11-21).
 *
 * One caller: the website's Worker, after it has verified Googlebot. It has a
 * key of its own on purpose. The render token only buys a rate-limit bucket,
 * and the origin-auth header is added by Cloudflare to every request from
 * anybody, so neither may ever open paid content.
 *
 * No key on the server is the off switch: every request is then a 404. POST
 * only, so nothing between here and the Worker can store the answer.
 */
export const dynamic = 'force-dynamic'

const KEY_HEADER = 'x-questura-crawler-key'
const MIN_KEY_LENGTH = 32

const SEGMENT = '[a-z0-9-]+'
const GLOBAL_PATH = new RegExp(`^/articles/(${SEGMENT})$`)
const CITY_PATH = new RegExp(`^/(${SEGMENT})/(${SEGMENT})/(${SEGMENT})/(${SEGMENT})$`)

const NO_STORE = { 'cache-control': 'private, no-store, max-age=0' }

type Target = { collection: ArticleCollectionSlug; match: Where; locationKey?: string }

function targetFor(path: unknown): Target | null {
  if (typeof path !== 'string' || path.length > 300) return null

  const global = GLOBAL_PATH.exec(path)
  if (global) return { collection: 'articles', match: { canonicalPath: { equals: path } } }

  const city = CITY_PATH.exec(path)
  if (!city) return null

  const [, country, cityName, kind, slug] = city
  if (kind !== 'maps' && kind !== 'itineraries') {
    return { collection: 'articles', match: { canonicalPath: { equals: path } } }
  }
  return {
    collection: kind === 'maps' ? 'single-type-listicles' : 'listicle-itineraries',
    match: { slug: { equals: slug } },
    locationKey: `${country}|${cityName}`,
  }
}

const digest = (value: string) => createHash('sha256').update(value).digest()

function hasKey(headers: Headers): boolean {
  const expected = process.env.QUESTURA_CRAWLER_BODY_KEY?.trim() ?? ''
  if (expected.length < MIN_KEY_LENGTH) return false
  return timingSafeEqual(digest(headers.get(KEY_HEADER) ?? ''), digest(expected))
}

function notFound() {
  return NextResponse.json({ message: 'Not found.' }, { status: 404, headers: NO_STORE })
}

export async function POST(req: NextRequest) {
  if (!hasKey(req.headers)) return notFound()

  try {
    const target = targetFor(((await req.json()) as { path?: unknown } | null)?.path)
    if (!target) return notFound()

    return await admitPublicWork('query', async () => {
      const payload = await getPayload({ config })
      const result = await payload.find({
        collection: target.collection,
        where: { and: [target.match, { status: { equals: 'published' } }, { language: { equals: DEFAULT_LANG } }] },
        limit: 1,
        depth: 2,
        overrideAccess: true,
      })
      if (result.totalDocs === 0) return notFound()

      const doc = result.docs[0] as unknown as Record<string, unknown>
      if (!isGatedItem(doc)) return notFound()

      if (target.locationKey) {
        const location = typeof doc.location === 'string' ? doc.location : ''
        if (location !== target.locationKey && !location.startsWith(`${target.locationKey}|`)) return notFound()
      }

      await serializeArticleByCollection(target.collection, doc, payload, { skipAudio: true })
      return NextResponse.json({ html: buildCrawlerBody(target.collection, doc) }, { headers: NO_STORE })
    })
  } catch (error) {
    if (error instanceof AdmissionRefused) return overloadedResponse(error)
    logger.error('Crawler body: read failed', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ message: 'Unavailable.' }, { status: 503, headers: NO_STORE })
  }
}
