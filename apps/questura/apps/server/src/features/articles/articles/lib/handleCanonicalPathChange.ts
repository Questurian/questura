import type { PayloadRequest } from 'payload'
import { buildCanonicalPath, resolveCategorySlug } from './canonicalPath'
import { recordPathRedirect } from '../../redirects/lib/recordPathRedirect'

type AnyDoc = Record<string, unknown>

type HandleArgs = {
  data: AnyDoc
  originalDoc: AnyDoc | undefined
  req: PayloadRequest
}

/**
 * Compute the article's canonical path, set it on `data`, and write any
 * required redirect rows when a *published* article's URL-affecting fields
 * (location, category, slug) change.
 *
 * Mutates `data.canonicalPath`. Returns nothing.
 */
export async function handleCanonicalPathChange({
  data,
  originalDoc,
  req,
}: HandleArgs): Promise<void> {
  const payload = req.payload

  const previousCategorySlug = await resolveCategorySlug(payload, originalDoc?.category)
  const nextCategorySlug = await resolveCategorySlug(
    payload,
    data.category ?? originalDoc?.category,
  )

  const oldPath = buildCanonicalPath({
    location: stringOrNull(originalDoc?.location),
    categorySlug: previousCategorySlug,
    slug: stringOrNull(originalDoc?.slug),
    status: stringOrNull(originalDoc?.status),
  })

  // Not `??`: a null location is an article being made worldwide, not a
  // location left untouched (undefined).
  const newPath = buildCanonicalPath({
    location: stringOrNull(data.location !== undefined ? data.location : originalDoc?.location),
    categorySlug: nextCategorySlug,
    slug: stringOrNull(data.slug ?? originalDoc?.slug),
    status: stringOrNull(data.status ?? originalDoc?.status),
  })

  data.canonicalPath = newPath

  const wasPublished = stringOrNull(originalDoc?.status) === 'published'
  if (!wasPublished || !oldPath || !newPath || oldPath === newPath) return

  const articleId = ((): number | string | null => {
    const id = originalDoc?.id
    if (typeof id === 'number' || typeof id === 'string') return id
    return null
  })()

  await recordPathRedirect({
    payload,
    oldPath,
    newPath,
    articleId,
    source: 'article-url-change',
  })
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}
