import { Fragment } from 'react'
import { BlockRenderer, ProseRun } from './BlockRenderer'
import { HotelCarouselLazy } from './HotelCarouselLazy'
import { InArticleAd } from './InArticleAd'
import type { AdPlan } from '../lib/adPlacement'
import { findHotelRuns } from '../lib/hotelRuns'
import type { ContentBlock } from '../types'

type ArticleBlockStreamProps = {
  blocks: ContentBlock[]
  plan: AdPlan
}

/**
 * Renders a run of blocks with the planned ads spliced in.
 *
 * Both sides of the paywall go through this: the server renders the sample,
 * and `GatedArticleBody` swaps in a member's whole body after hydration
 * (ADR-0009). The plan is indexed against `blocks`, whichever of the two it is.
 *
 * Fragments, not wrappers -- the parent's `space-y-*` only reaches direct DOM
 * children, and an extra div would swallow the gaps.
 *
 * Hotel cards in a row draw as one carousel at the first card (`hotelRuns`);
 * the others draw nothing, so every index the plan names still lines up.
 */
export function ArticleBlockStream({ blocks, plan }: ArticleBlockStreamProps) {
  const hotelRuns = findHotelRuns(blocks)

  return (
    <>
      {blocks.map((block, index) => {
        const runs = plan.proseRuns.get(index)
        const runAds = plan.proseAds.get(index) ?? []
        const afterBlock = plan.afterBlock.get(index)
        const hotelRun = hotelRuns.starts.get(index)

        return (
          <Fragment key={block.id}>
            {runs && block.blockType === 'text' ? (
              runs.map((html, runIndex) => (
                <Fragment key={runIndex}>
                  <ProseRun html={html} />
                  {runIndex < runs.length - 1 ? (
                    <InArticleAd
                      slotId={`body-${index}-${runIndex}`}
                      variant={runAds[runIndex]}
                    />
                  ) : null}
                </Fragment>
              ))
            ) : hotelRun ? (
              <HotelCarouselLazy hotels={hotelRun} />
            ) : hotelRuns.members.has(index) ? null : (
              <BlockRenderer block={block} />
            )}
            {afterBlock ? (
              <InArticleAd slotId={`body-${index}`} variant={afterBlock} />
            ) : null}
          </Fragment>
        )
      })}
    </>
  )
}
