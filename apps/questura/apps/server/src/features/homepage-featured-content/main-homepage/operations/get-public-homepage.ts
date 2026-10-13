import type { PayloadInstance } from '@/types'

import type {
  PageReadBudgetOptions,
  PageReadStats,
} from '../../reference-grid/page-read-budget'
import { formatPublicLocationHomepageDoc } from '../../resolve-page-blocks/operations/format-public-homepage-doc'
import { resolvePageBlocksWithReadStats } from '../../resolve-page-blocks/operations/resolve-blocks'
import {
  MAIN_HOMEPAGE_LOCATION_GRID_SCOPE,
  getPublishedPageBlocks,
  loadMainHomepage,
} from '../lib/persistence'
import type { CuratedPageKey } from '../pages'

/**
 * The published main homepage, shaped exactly like a public city homepage so
 * the website renders it with the same block components. Only the published
 * snapshot is read; the editor's draft never leaves the server.
 *
 * Until this existed the studio could publish the main homepage and nothing
 * served it: questurian.com rendered an empty section (2026-10-11).
 */
export async function getPublicMainHomepage(
  payload: PayloadInstance,
  budget: PageReadBudgetOptions = {},
  page: CuratedPageKey = 'main',
): Promise<{ status: number; body: unknown; stats: PageReadStats }> {
  const doc = await loadMainHomepage(payload, page)
  const { blocks, stats } = await resolvePageBlocksWithReadStats(
    payload,
    getPublishedPageBlocks(doc),
    MAIN_HOMEPAGE_LOCATION_GRID_SCOPE,
    budget,
  )

  return { status: 200, body: formatPublicLocationHomepageDoc(blocks), stats }
}
