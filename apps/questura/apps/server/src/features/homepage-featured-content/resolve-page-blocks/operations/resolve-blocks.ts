import type { PayloadInstance } from '@/types'

import type { RawBlock } from '../types'

import { curatedBlockRegistry } from '../../block-registry'
import {
  withPageReadBudget,
  type PageReadBudgetOptions,
  type PageReadStats,
} from '../../reference-grid/page-read-budget'
import { resolveStoredSlotCountForBlockType } from '../../slot-count/service'
import { curatedBlockApiPayload } from '../lib/curated-block-api-payload'
import { resolveLocationGridScope } from './resolve-scope'
import { articleIdsWithAudio } from '@/features/audio-clips/lib/public-audio'

/**
 * Cards draw an Audio badge on articles that have AudioClips (ADR-0018). One
 * query for the whole page, after the blocks resolve and outside their read
 * budget, which bounds the reference reads the blocks themselves make.
 */
async function markArticlesWithAudio(payload: PayloadInstance, blocks: unknown[]) {
  const items: Array<Record<string, unknown>> = []
  for (const block of blocks) {
    const selection = block && typeof block === 'object' ? (block as Record<string, unknown>).selection : null
    const list = selection && typeof selection === 'object' ? (selection as Record<string, unknown>).items : null
    if (!Array.isArray(list)) continue
    for (const item of list) {
      if (item && typeof item === 'object' && (item as Record<string, unknown>).relationTo === 'articles') {
        items.push(item as Record<string, unknown>)
      }
    }
  }
  if (items.length === 0) return
  const withAudio = await articleIdsWithAudio(
    payload as unknown as Parameters<typeof articleIdsWithAudio>[0],
    items.map((item) => Number(item.id)),
  ).catch(() => new Set<number>())
  for (const item of items) item.hasAudio = withAudio.has(Number(item.id))
}

async function resolveAll(
  payload: PayloadInstance,
  rawBlocks: RawBlock[],
  locationGridScope: Awaited<ReturnType<typeof resolveLocationGridScope>>,
) {
  return Promise.all(
    rawBlocks.map(async (block) => {
      const definition = curatedBlockRegistry.get(String(block.blockType))
      if (!definition) {
        return block
      }

      const slotCount = resolveStoredSlotCountForBlockType(block.blockType, block.slotCount)
      const selection = await definition.behavior.resolveSelection(block.items, {
        payload,
        slotCount,
        locationGridScope,
        block,
      })

      const resolvedFields = definition.behavior.resolveFields
        ? await definition.behavior.resolveFields(block, {
            payload,
            slotCount,
            locationGridScope,
            block,
          })
        : undefined

      return curatedBlockApiPayload(block, selection, resolvedFields)
    }),
  )
}

/**
 * Resolve every block on one page under one shared read budget.
 *
 * The blocks themselves have always resolved concurrently; what was missing is
 * that each one took its own six-read allowance, so the documented page-wide
 * bound was six *per block* against a 20-connection pool. `withPageReadBudget`
 * makes the six a property of the page, and dedupes references repeated across
 * blocks so a city that appears in a location grid and a featured row is read
 * once.
 */
export async function resolvePageBlocksWithReadStats(
  payload: PayloadInstance,
  rawBlocks: RawBlock[],
  locationGridScope: Awaited<ReturnType<typeof resolveLocationGridScope>>,
  budget: PageReadBudgetOptions = {},
): Promise<{ blocks: Awaited<ReturnType<typeof resolveAll>>; stats: PageReadStats }> {
  const { result, stats } = await withPageReadBudget(
    () => resolveAll(payload, rawBlocks, locationGridScope),
    budget,
  )

  await markArticlesWithAudio(payload, result)
  return { blocks: result, stats }
}

export async function resolvePageBlocks(
  payload: PayloadInstance,
  rawBlocks: RawBlock[],
  locationGridScope: Awaited<ReturnType<typeof resolveLocationGridScope>>,
) {
  const { blocks } = await resolvePageBlocksWithReadStats(payload, rawBlocks, locationGridScope)
  return blocks
}
