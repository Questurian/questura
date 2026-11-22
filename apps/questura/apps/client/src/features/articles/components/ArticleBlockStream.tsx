import { Fragment, type ReactNode } from 'react'
import { ArticleContents } from './ArticleContents'
import { BlockRenderer, ProseRun } from './BlockRenderer'
import { HotelCarouselLazy } from './HotelCarouselLazy'
import { InArticleAd } from './InArticleAd'
import type { AdPlan } from '../lib/adPlacement'
import { findContentsSlot, type ContentsSlot } from '../lib/contentsPlacement'
import { findPitchSlots } from '../lib/pitchPlacement'
import { findHotelRuns } from '../lib/hotelRuns'
import type { ContentBlock, TableOfContentsEntry } from '../types'

type ArticleBlockStreamProps = {
  blocks: ContentBlock[]
  plan: AdPlan
  /** The Contents box's lines, when the article has it on. */
  contents?: TableOfContentsEntry[]
  /** A free article's membership box, drawn where `findPitchSlots` says. */
  pitch?: ReactNode
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
 *
 * The Contents box, when there is one, goes right before the first H2
 * (`contentsPlacement`), cutting the prose run that holds it in two. The
 * membership box of a free article cuts its runs the same way.
 */
export function ArticleBlockStream({ blocks, plan, contents, pitch }: ArticleBlockStreamProps) {
  const hotelRuns = findHotelRuns(blocks)
  const slot = contents?.length ? findContentsSlot(blocks, plan) : null
  const contentsBox = contents?.length ? <ArticleContents entries={contents} /> : null

  const cuts: Array<{ at: ContentsSlot; box: ReactNode }> = pitch
    ? findPitchSlots(blocks, plan).map((at) => ({ at, box: pitch }))
    : []
  if (slot) cuts.unshift({ at: slot, box: contentsBox })

  const proseRun = (html: string, index: number, runIndex: number): ReactNode => {
    const here = cuts.filter(({ at }) => at.blockIndex === index && at.runIndex === runIndex)
    if (here.length === 0) return <ProseRun html={html} />

    return (
      <>
        {here.map(({ at, box }, i) => {
          const before = html.slice(here[i - 1]?.at.offset ?? 0, at.offset)
          return (
            <Fragment key={at.offset}>
              {before.trim() ? <ProseRun html={before} /> : null}
              {box}
            </Fragment>
          )
        })}
        <ProseRun html={html.slice(here[here.length - 1].at.offset)} />
      </>
    )
  }

  return (
    <>
      {blocks.map((block, index) => {
        const planned = plan.proseRuns.get(index)
        const runs = planned ?? (block.blockType === 'text' && cuts.some(({ at }) => at.blockIndex === index) ? [block.content] : null)
        const runAds = plan.proseAds.get(index) ?? []
        const afterBlock = plan.afterBlock.get(index)
        const hotelRun = hotelRuns.starts.get(index)
        const boxBeforeBlock = slot?.blockIndex === index && block.blockType !== 'text'

        return (
          <Fragment key={block.id}>
            {boxBeforeBlock ? contentsBox : null}
            {runs && block.blockType === 'text' ? (
              runs.map((html, runIndex) => (
                <Fragment key={runIndex}>
                  {proseRun(html, index, runIndex)}
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
