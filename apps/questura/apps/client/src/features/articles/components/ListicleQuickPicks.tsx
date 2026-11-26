import type { JSX } from 'react'
import { EditorialBox } from '@/features/articles/components/EditorialBox'
import { editorialKickerClass } from '@/features/articles/components/EditorialRule'
import type { ListicleQuickPick } from '@/features/articles/lib/listicleQuickPicks'

/**
 * The Quick picks box under a map listicle's header (owner, 2026-11-26): one
 * row per labelled place, the reader's need on the left, the place's name
 * linking to its entry, and a line of facts. Built on the editorial paper box
 * like Key takeaways, so it reads as part of the article, not as UI. It sits
 * above the intro so a reader who arrives from a search sees names on the
 * first screen, and it is a real list, which is the shape search engines lift
 * into their answers.
 */
export function ListicleQuickPicks({ picks }: { picks: readonly ListicleQuickPick[] }): JSX.Element | null {
  if (picks.length === 0) return null
  return (
    <EditorialBox
      as="section"
      label="Quick picks"
      className="listicle-quick-picks !py-5 sm:!py-6"
    >
      <ol className="m-0 list-none p-0">
        {picks.map((pick) => (
          <li
            key={pick.index}
            className="grid grid-cols-[6.25rem_minmax(0,1fr)] items-baseline gap-x-3 border-t border-foreground/15 py-2.5 first:border-t-0 first:pt-0 last:pb-0 380:grid-cols-[7rem_minmax(0,1fr)] sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-x-4 sm:py-3"
          >
            <span className={`${editorialKickerClass} !leading-[1.35] text-foreground/60`}>{pick.label}</span>
            <span className="min-w-0">
              <a
                href={`#${pick.anchorId}`}
                className="listicle-quick-pick-link font-display text-[17px] font-bold leading-[1.3] text-foreground 480:text-[18px] sm:text-[19px]"
              >
                {pick.title}
              </a>
              {pick.note ? (
                <span className="mt-0.5 block font-[family-name:var(--font-dm-sans)] text-[13px] leading-[1.4] text-foreground/65 sm:text-[14px]">
                  {pick.note}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </EditorialBox>
  )
}
