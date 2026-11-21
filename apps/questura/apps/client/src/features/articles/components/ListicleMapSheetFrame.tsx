import type { JSX } from 'react'
import { MapJoinCall } from '@/features/articles/components/MapJoinCall'
import { ListicleMapSwitch } from '@/features/articles/components/ListicleMapSwitch'
import { INITIAL_LISTICLE_MAP_MODE } from '@/features/articles/components/ListicleMapModes'

/**
 * The phone map sheet as the server paints it, before the real one exists.
 *
 * The real sheet (ListicleMapSheet) needs the browser: it measures the
 * viewport and is loaded after hydration. Painted only then, a phone reader
 * saw the article fill the screen and start reading, and seconds later the
 * bottom half was taken by the sheet, then a join bar, then dots, then the
 * map (audit, 2026-11-21). This frame holds the sheet's split-view place,
 * its switch and, for a reader who will get the locked picture, its join bar
 * from the first paint, so the page opens in its final shape.
 *
 * It sits above the real sheet and steps aside (CSS, article-prose-and-media
 * .css) the moment the real sheet has a map surface to show: the Google map or
 * the locked picture, each of which fades in over the same paper.
 *
 * Its height mirrors the split geometry in ListicleMapModes: the locked
 * picture's sheet hangs from the bottom of the screen and shows
 * LOCKED_SPLIT_VISIBLE_FRACTION (46%) of the large viewport; a member's
 * hangs from the top with SPLIT_VISIBLE_FRACTION (42%) of it below the fold
 * line, which on screen is 100svh - 58lvh. While access is still being
 * worked out, `html[data-identity]` (the head script's guess) picks; the
 * layout around it carries the access (`data-map-access`).
 *
 * A server component, passed into the client layout as a prop, so none of
 * this reaches the page's JavaScript (the guide routes are at their budget).
 */
export function ListicleMapSheetFrame({ returnTo }: { returnTo: string }): JSX.Element {
  const href = `/join?returnTo=${encodeURIComponent(returnTo)}`

  return (
    <>
      <div
        aria-hidden="true"
        inert
        data-map-sheet-frame=""
        className="map-sheet-frame pointer-events-none fixed inset-x-0 bottom-0 z-[31] border-t-[3px] border-double border-foreground/55 bg-paper 1024:hidden"
      >
        <div className="map-sheet-frame-join">
          <MapJoinCall compact href={href} />
        </div>
      </div>
      <div
        aria-hidden="true"
        inert
        data-map-sheet-frame=""
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[34] flex flex-col items-center gap-2.5 px-3 1024:hidden"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <ListicleMapSwitch mode={INITIAL_LISTICLE_MAP_MODE} />
      </div>
    </>
  )
}
