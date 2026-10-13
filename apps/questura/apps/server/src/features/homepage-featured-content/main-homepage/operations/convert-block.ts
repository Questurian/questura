import {
  assertFeaturedArticlesBlockConvertible,
  buildConvertedHomepageBlock,
  normalizeSlotCountForBlockType,
} from '../../convert-empty-block/service'
import { type RawBlock } from '../../resolve-page-blocks/service'
import { isValidRequestedSlotCount } from '../../slot-count/service'
import {
  formatMainHomepage,
  getDraftPageBlocks,
  getMainHomepagePayload,
  loadMainHomepage,
  resolveMainBlocks,
  updateMainHomepageDraft,
} from '../lib/persistence'
import type { MainHomepageOperationResult } from '../types'
import { CURATED_PAGES, type CuratedPageKey } from '../pages'

type ConvertBlockBody = { block: unknown } | { message: string }

export async function convertMainHomepageBlock(
  body: unknown,
  leanResponse: boolean,
  page: CuratedPageKey = 'main',
): Promise<MainHomepageOperationResult<Awaited<ReturnType<typeof formatMainHomepage>> | ConvertBlockBody>> {
  const input = body as { blockId?: unknown; blockType?: unknown; slotCount?: unknown } | null
  const blockId = typeof input?.blockId === 'string' ? input.blockId : ''
  const blockType = typeof input?.blockType === 'string' ? input.blockType : ''
  const slotCount = typeof input?.slotCount === 'number' ? input.slotCount : Number(input?.slotCount)

  if (!blockId || !blockType || !Number.isFinite(slotCount)) {
    return { status: 400, body: { message: 'blockId, blockType, and slotCount are required.' } }
  }

  const payload = await getMainHomepagePayload()
  const doc = await loadMainHomepage(payload, page)
  const blocks = getDraftPageBlocks(doc)
  const blockIndex = blocks.findIndex((block) => block.id === blockId)
  if (blockIndex === -1) return { status: 404, body: { message: `Block ${blockId} not found in ${CURATED_PAGES[page].label}.` } }

  const block = blocks[blockIndex]
  assertFeaturedArticlesBlockConvertible(block)
  const normalizedSlotCount = normalizeSlotCountForBlockType(blockType, slotCount)
  if (!isValidRequestedSlotCount(blockType, normalizedSlotCount)) {
    return {
      status: 400,
      body: { message: `slotCount ${normalizedSlotCount} is not supported for "${blockType}".` },
    }
  }

  const replacement = buildConvertedHomepageBlock(block, blockType, normalizedSlotCount) as RawBlock
  const updatedBlocks = [...blocks]
  updatedBlocks[blockIndex] = replacement
  const updated = await updateMainHomepageDraft(payload, updatedBlocks, page)

  if (leanResponse) {
    const [resolvedBlock] = await resolveMainBlocks(payload, [replacement])
    return { status: 200, body: { block: resolvedBlock } }
  }

  return { status: 200, body: await formatMainHomepage(payload, updated) }
}
