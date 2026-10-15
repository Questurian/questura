import { randomUUID } from 'node:crypto'

import { parseNewBlockInput } from '../../resolve-page-blocks/service'
import {
  getDraftPageBlocks,
  getMainHomepagePayload,
  loadMainHomepage,
  updateAndFormatMainHomepageBlocks,
} from '../lib/persistence'
import type {
  MainHomepageErrorBody,
  MainHomepageOperationResult,
} from '../types'
import type { CuratedPageKey } from '../pages'

export async function addMainHomepageBlock(
  body: unknown,
  page: CuratedPageKey = 'main',
): Promise<MainHomepageOperationResult<Awaited<ReturnType<typeof updateAndFormatMainHomepageBlocks>> | MainHomepageErrorBody>> {
  const parsed = parseNewBlockInput(body)
  if (!parsed.ok) return { status: parsed.status, body: { message: parsed.message } }

  if (parsed.blockType === 'photo-pile' && page === 'main') {
    return {
      status: 400,
      body: { message: 'Photo Pile blocks open the Eat, Stay and Itineraries pages only.' },
    }
  }

  const payload = await getMainHomepagePayload()
  const doc = await loadMainHomepage(payload, page)
  const draftBlocks = getDraftPageBlocks(doc)
  if (parsed.blockType === 'photo-pile' && draftBlocks.some((block) => block.blockType === 'photo-pile')) {
    return { status: 400, body: { message: 'This page already has its Photo Pile.' } }
  }
  // Main homepage blocks live in a JSON field, unlike location homepage
  // Payload blocks. Payload therefore cannot mint their row ids for us.
  const block = { ...parsed.block, id: randomUUID() }
  // The Photo Pile opens its page, so it goes in first wherever it is added.
  const blocks = parsed.blockType === 'photo-pile' ? [block, ...draftBlocks] : [...draftBlocks, block]
  const formatted = await updateAndFormatMainHomepageBlocks(payload, blocks, page)

  return { status: 201, body: formatted }
}
