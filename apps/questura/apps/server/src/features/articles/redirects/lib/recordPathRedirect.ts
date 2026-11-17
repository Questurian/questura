import type { Payload } from 'payload'

type RecordPathRedirectArgs = {
  payload: Payload
  oldPath: string
  newPath: string
  /** The article the redirect belongs to. Map guides and itineraries leave it empty. */
  articleId?: number | string | null
  source: string
}

/**
 * Point `oldPath` at `newPath` for good, after a live page's address changed.
 *
 * 1. Upsert the redirect oldPath -> newPath.
 * 2. Flatten chains: redirects that pointed at oldPath now point at newPath.
 * 3. Drop any redirect whose oldPath is newPath: that address is live again.
 */
export async function recordPathRedirect({
  payload,
  oldPath,
  newPath,
  articleId = null,
  source,
}: RecordPathRedirectArgs): Promise<void> {
  if (oldPath === newPath) return

  const existing = await payload.find({
    collection: 'article-redirects',
    where: { oldPath: { equals: oldPath } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const data = {
    newPath,
    article: articleId as number | null,
    source,
    statusCode: '301' as const,
  }

  if (existing.totalDocs > 0) {
    const row = existing.docs[0] as unknown as { id: string | number }
    await payload.update({
      collection: 'article-redirects',
      id: row.id,
      data,
      overrideAccess: true,
    })
  } else {
    await payload.create({
      collection: 'article-redirects',
      data: { oldPath, ...data },
      overrideAccess: true,
    })
  }

  const chained = await payload.find({
    collection: 'article-redirects',
    where: { newPath: { equals: oldPath } },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })
  for (const doc of chained.docs) {
    const row = doc as unknown as { id: string | number; oldPath?: string }
    if (row.oldPath === newPath) continue
    await payload.update({
      collection: 'article-redirects',
      id: row.id,
      data: { newPath },
      overrideAccess: true,
    })
  }

  const selfRef = await payload.find({
    collection: 'article-redirects',
    where: { oldPath: { equals: newPath } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })
  for (const doc of selfRef.docs) {
    const row = doc as unknown as { id: string | number }
    await payload.delete({
      collection: 'article-redirects',
      id: row.id,
      overrideAccess: true,
    })
  }
}
