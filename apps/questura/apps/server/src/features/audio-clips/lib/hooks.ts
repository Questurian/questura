import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

import { requestRevalidation } from '@/features/refresh-outbox/request'
import {
  articleRevalidationTarget,
  featuringHomepagesTarget,
  mergeTargets,
} from '@/features/public-revalidation/revalidation/targets'
import type { AnyDoc } from '@/features/public-revalidation/revalidation/types'
import { logger } from '@/shared/utils/logger'

import { deleteAudioFile } from './storage'

/**
 * A new, replaced or deleted clip changes the article page (its players and
 * "N-min listen" line) and every card that shows the article (the Audio
 * badge), so both are refreshed like an edit to the article itself.
 */
async function revalidateArticle(req: PayloadRequest, articleId: unknown, reason: string) {
  if (typeof articleId !== 'number') return
  const article = await req.payload
    .findByID({ collection: 'articles', id: articleId, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  if (!article) return
  await requestRevalidation(
    req,
    mergeTargets(
      articleRevalidationTarget('articles', article as unknown as AnyDoc),
      await featuringHomepagesTarget(req, 'articles', articleId),
    ),
    reason,
  )
}

export const revalidateAudioClipArticle: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  await revalidateArticle(req, doc?.articleId, `audio-clips:${operation}`)
  return doc
}

export const deleteAudioClipFileAfterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  if (typeof doc?.storageKey === 'string' && doc.storageKey) {
    // The row is gone either way; a file left behind costs pennies and is
    // logged, while failing the delete would leave a row pointing nowhere.
    await deleteAudioFile(doc.storageKey).catch((error: unknown) => {
      logger.error('[audio-clips] could not delete file after row delete', {
        storageKey: doc.storageKey,
        error: error instanceof Error ? error.message : String(error),
      })
    })
  }
  await revalidateArticle(req, doc?.articleId, 'audio-clips:delete')
  return doc
}
