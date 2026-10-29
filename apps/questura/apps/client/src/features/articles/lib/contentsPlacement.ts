import type { AdPlan } from './adPlacement'

/**
 * Where the Contents box goes in a standard article: right before the first
 * H2, which is where the intro ends.
 *
 * The intro and the first heading usually share one text block, and an ad can
 * already have split that block into runs, so the slot names a block, a run
 * inside it and a character offset inside that run. Offset 0 means "before the
 * run". An article whose rendered blocks hold no H2 (a short free sample) gets
 * the box before its first block.
 */
export type ContentsSlot = {
  blockIndex: number
  runIndex: number
  offset: number
}

type SlotBlock = { blockType: string; content?: string }

const FIRST_H2 = /<h2[\s>]/

export function findContentsSlot(
  blocks: SlotBlock[],
  plan: Pick<AdPlan, 'proseRuns'>,
): ContentsSlot | null {
  if (blocks.length === 0) return null

  for (const [blockIndex, block] of blocks.entries()) {
    if (block.blockType !== 'text' || typeof block.content !== 'string') continue
    const runs = plan.proseRuns.get(blockIndex) ?? [block.content]
    for (const [runIndex, html] of runs.entries()) {
      const offset = html.search(FIRST_H2)
      if (offset >= 0) return { blockIndex, runIndex, offset }
    }
  }

  return { blockIndex: 0, runIndex: 0, offset: 0 }
}
