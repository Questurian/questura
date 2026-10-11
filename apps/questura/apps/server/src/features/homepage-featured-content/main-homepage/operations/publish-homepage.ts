import {
  assertPublishableResolvedBlocks,
  snapshotDraftBlocksForPublish,
} from '../../location-homepages/operations/publish-homepage'
import {
  formatMainHomepage,
  getDraftPageBlocks,
  getMainHomepagePayload,
  getPublishedPageBlocks,
  loadMainHomepage,
  resolveMainBlocks,
} from '../lib/persistence'
import type {
  MainHomepageDoc,
  MainHomepageOperationResult,
} from '../types'

// questurian.com draws only what is published here, so an empty publish
// blanks the live homepage. City homepages fall back to an article list when
// empty; the main homepage has nothing to fall back to.
export const EMPTY_MAIN_HOMEPAGE_MESSAGE =
  'The main homepage needs at least one block. Publishing it empty would leave questurian.com blank.'

export async function publishMainHomepage(
  userId: string | number | null,
): Promise<MainHomepageOperationResult> {
  const payload = await getMainHomepagePayload()
  const doc = await loadMainHomepage(payload)
  const draftBlocks = getDraftPageBlocks(doc)
  if (draftBlocks.length === 0) {
    return { status: 400, body: { message: EMPTY_MAIN_HOMEPAGE_MESSAGE } }
  }
  const resolvedDraftBlocks = await resolveMainBlocks(payload, draftBlocks)
  assertPublishableResolvedBlocks(resolvedDraftBlocks)

  const nextRevision = Math.max(0, Number(doc.publishedRevision) || 0) + 1
  const updated = (await payload.updateGlobal({
    slug: 'main-homepage',
    data: {
      publishedPageBlocks: snapshotDraftBlocksForPublish(draftBlocks),
      lastPublishedAt: new Date().toISOString(),
      lastPublishedBy: userId ?? undefined,
      publishedRevision: nextRevision,
    } as never,
    depth: 0,
    overrideAccess: true,
  })) as unknown as MainHomepageDoc

  return {
    status: 200,
    body: await formatMainHomepage(payload, updated, getPublishedPageBlocks(updated)),
  }
}
