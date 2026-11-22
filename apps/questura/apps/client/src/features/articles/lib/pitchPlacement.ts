import type { AdPlan } from './adPlacement'
import type { ContentsSlot } from './contentsPlacement'

/**
 * Where a free article asks for the sale mid-page: where its first and second
 * sections end, which is right before the second and third H2. An article
 * with fewer than four sections only gets the box at its end.
 */

const MIN_SECTIONS = 4
const H2 = /<h2[\s>]/g

export function findPitchSlots(
  blocks: Array<{ blockType: string; content?: string }>,
  plan: Pick<AdPlan, 'proseRuns'>,
): ContentsSlot[] {
  const headings: ContentsSlot[] = []
  for (const [blockIndex, block] of blocks.entries()) {
    if (block.blockType !== 'text' || typeof block.content !== 'string') continue
    const runs = plan.proseRuns.get(blockIndex) ?? [block.content]
    for (const [runIndex, html] of runs.entries()) {
      for (const match of html.matchAll(H2)) {
        headings.push({ blockIndex, runIndex, offset: match.index })
      }
    }
  }
  return headings.length >= MIN_SECTIONS ? headings.slice(1, 3) : []
}
