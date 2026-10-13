import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from 'payload'
import { requestRevalidation } from '@/features/refresh-outbox/request'
import {
  articleRevalidationTarget,
  authoredArticlesTarget,
  authorTarget,
  featuringHomepagesTarget,
  locationHomepageTarget,
  locationTarget,
  mergeTargets,
  redirectTarget,
} from './targets'
import { publicCacheTags } from './cache-tags'
import { idValue } from './documents'
import type { AnyDoc } from './types'

export function revalidateArticleCollection(
  collection: 'articles' | 'single-type-listicles' | 'listicle-itineraries',
) {
  const afterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
    const before = articleRevalidationTarget(collection, previousDoc as AnyDoc | undefined)
    const after = articleRevalidationTarget(collection, doc as AnyDoc | undefined)
    // Only a live article can be on a live homepage.
    const wasLive = Boolean(before.paths?.length || before.tags?.length)
    const isLive = Boolean(after.paths?.length || after.tags?.length)
    const id = idValue(doc)

    await requestRevalidation(
      req,
      mergeTargets(
        before,
        after,
        id !== null && (wasLive || isLive)
          ? await featuringHomepagesTarget(req, collection, id)
          : {},
      ),
      `${collection}:${operation}`,
    )
  }

  const afterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
    await requestRevalidation(
      req,
      articleRevalidationTarget(collection, doc as AnyDoc | undefined),
      `${collection}:delete`,
    )
  }

  return { afterChange, afterDelete }
}

// Author edits (display name, bio, avatar, social links, slug renames) must
// refresh the public author page; both old and new slug URLs are covered.
// Runs on Authors rather than Users since ADR-0007 moved the public profile
// there -- editing a staff account no longer changes what the page renders.
export const revalidateAuthorAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation,
}) => {
  const authorId = idValue(doc) ?? idValue(previousDoc)

  await requestRevalidation(
    req,
    mergeTargets(
      authorTarget(previousDoc as AnyDoc | undefined),
      authorTarget(doc as AnyDoc | undefined),
      authorId ? await authoredArticlesTarget(req, authorId) : {},
    ),
    `authors:${operation}`,
  )
}

export const revalidateLocationHomepageAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation,
}) => {
  await requestRevalidation(
    req,
    mergeTargets(
      await locationHomepageTarget(req, previousDoc as AnyDoc | undefined),
      await locationHomepageTarget(req, doc as AnyDoc | undefined),
    ),
    `location-homepages:${operation}`,
  )
}

export const revalidateLocationHomepageAfterDelete: CollectionAfterDeleteHook = async ({
  doc,
  req,
}) => {
  await requestRevalidation(
    req,
    await locationHomepageTarget(req, doc as AnyDoc | undefined),
    'location-homepages:delete',
  )
}

// Any save of the main homepage global refreshes questurian.com. Draft edits
// trigger it too, which is harmless: the page only ever reads the published
// snapshot, so it re-renders unchanged.
export const revalidateMainHomepageAfterChange: GlobalAfterChangeHook = async ({ req }) => {
  await requestRevalidation(
    req,
    { tags: [publicCacheTags.mainHomepage()], paths: ['/'] },
    'main-homepage:update',
  )
}

// The same for a navbar section page (/eat, /stay, /itineraries).
export const revalidateSectionPageAfterChange =
  (page: string, path: string): GlobalAfterChangeHook =>
  async ({ req }) => {
    await requestRevalidation(
      req,
      { tags: [publicCacheTags.sectionPage(page)], paths: [path] },
      `section-page:${page}:update`,
    )
  }

export const revalidateLocationAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  await requestRevalidation(
    req,
    mergeTargets(
      locationTarget(previousDoc as AnyDoc | undefined),
      locationTarget(doc as AnyDoc | undefined),
    ),
    `locations:${operation}`,
  )
}

export const revalidateLocationAfterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await requestRevalidation(req, locationTarget(doc as AnyDoc | undefined), 'locations:delete')
}

export const revalidateArticleRedirectAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  await requestRevalidation(
    req,
    mergeTargets(
      redirectTarget(previousDoc as AnyDoc | undefined),
      redirectTarget(doc as AnyDoc | undefined),
    ),
    `article-redirects:${operation}`,
  )
}

export const revalidateArticleRedirectAfterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await requestRevalidation(
    req,
    redirectTarget(doc as AnyDoc | undefined),
    'article-redirects:delete',
  )
}
