'use client'

import { useLayoutEffect, useRef, useState, type JSX } from 'react'
import { ChevronDown, Compass } from 'lucide-react'
import Link from '@/components/navigation/PublicLink'
import { ShimmerImage } from '@/components/media/ShimmerImage'
import { LISTICLE_MAP_CONTROLS_SELECTOR } from '@/features/articles/components/ListicleMapModes'
import type { RelatedMapsArticleTeaser } from '@/features/articles/lib/fetchRelatedMapsArticles'
import { relatedArticleHref } from '@/features/articles/lib/relatedArticleHref'
import { useMenuDismiss } from '@/features/articles/lib/useMenuDismiss'

export type ListicleMapGuides = {
  articles: RelatedMapsArticleTeaser[]
  country: string
  city?: string | null
}

/** One guide: a 32px thumbnail with 4px above and below. */
const ROW_HEIGHT = 40
/**
 * Two guides and the top of a third, so the cut-off row says the list
 * scrolls. Split leaves the map well under half the screen, and a menu as
 * long as the guides list ran off the bottom of it.
 */
const LIST_MAX_HEIGHT = ROW_HEIGHT * 2 + 18
const MENU_GAP = 6
/** Air kept between the open menu and the floating switch below it. */
const FLOOR_MARGIN = 8

/**
 * The related-guides shelf, folded into a menu that sits on the map.
 *
 * Desktop reads that shelf under the map column, but the phone's takeover
 * covers the page, so without this the map is a room with no other door: the
 * reader can step between pins and nowhere else. The menu ends with the
 * city (or country) hub so there is always a way out to more places, not just
 * to the handful of guides the article happens to link.
 *
 * Beside the stepper the trigger's height is pinned to the stepper's button
 * size so the two pills sit level in the chrome cluster. Alone in split it is
 * `compact`: smaller to the eye, with its tap area grown back out to 44px.
 *
 * The open menu ends above the floating switch whatever the map's height, and
 * the hub link stays pinned under the scrolling list.
 */
export function ListicleMapGuidesMenu({
  articles,
  country,
  city,
  compact = false,
}: ListicleMapGuides & { compact?: boolean }): JSX.Element | null {
  const [open, setOpen] = useState(false)
  const [roomPx, setRoomPx] = useState<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useMenuDismiss(open, () => setOpen(false), rootRef)

  // Measured before paint so the menu never flashes at full length.
  useLayoutEffect(() => {
    if (!open) return
    const measure = () => {
      const trigger = rootRef.current?.getBoundingClientRect()
      if (!trigger) return
      const controls = document.querySelector(LISTICLE_MAP_CONTROLS_SELECTOR)
      const floor = Math.min(
        window.innerHeight,
        controls?.getBoundingClientRect().top ?? Infinity,
      )
      setRoomPx(Math.max(floor - trigger.bottom - MENU_GAP - FLOOR_MARGIN, ROW_HEIGHT))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open])

  const hubHref = city ? `/${country}/${city}` : `/${country}`
  const hubLabel = `All ${city ?? country} guides`.replace(/-/g, ' ')

  return (
    <div ref={rootRef} className="pointer-events-auto relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className={`relative flex items-center rounded-full border border-foreground/15 bg-paper/95 font-bold uppercase leading-none text-foreground/70 shadow-[0_4px_14px_rgba(26,26,26,0.16)] transition-colors hover:text-accent ${
          compact
            ? "h-8 gap-1 pl-2.5 pr-2 text-[10px] tracking-[0.1em] before:absolute before:-inset-x-1 before:-inset-y-1.5 before:content-['']"
            : 'h-10 gap-1.5 pl-3 pr-2.5 text-[11px] tracking-[0.12em] 1024:h-9'
        }`}
      >
        <Compass
          className={`shrink-0 ${compact ? 'size-[13px]' : 'size-[15px]'}`}
          aria-hidden="true"
        />
        More guides
        <ChevronDown
          className={`shrink-0 transition-transform ${compact ? 'size-3' : 'size-3.5'} ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="More guides"
          className="absolute right-0 z-20 flex w-[240px] flex-col overflow-hidden rounded-xl border border-foreground/15 bg-paper p-1 shadow-[0_10px_30px_rgba(26,26,26,0.22)]"
          style={{ top: `calc(100% + ${MENU_GAP}px)`, maxHeight: roomPx ?? undefined }}
        >
          <div
            className="min-h-0 overflow-y-auto overscroll-contain"
            style={{ maxHeight: LIST_MAX_HEIGHT }}
          >
            {articles.map((article) => {
              const imageUrl = article.header?.featuredImage?.url ?? null
              const href = relatedArticleHref(article, country, city)

              return (
                <Link
                  key={`${article.routeType}-${article.id}`}
                  href={href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-paper-accent"
                >
                  <span className="size-8 shrink-0 overflow-hidden rounded-sm bg-[#e5e0d8]">
                    {imageUrl ? (
                      <ShimmerImage
                        src={imageUrl}
                        alt={article.header?.featuredImage?.alt_text ?? ''}
                        width={64}
                        height={64}
                        sizes="32px"
                        className="h-full w-full object-cover"
                        wrapperClassName="h-full w-full"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1 text-[0.72rem] font-medium leading-[1.25] text-foreground/70 transition-colors group-hover:text-foreground [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] [overflow-wrap:anywhere] overflow-hidden">
                    {article.title}
                  </span>
                </Link>
              )
            })}
          </div>

          <Link
            href={hubHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-1 flex shrink-0 items-center justify-between gap-2 border-t border-foreground/12 px-2 pb-1.5 pt-2.5 text-[11px] font-bold uppercase leading-none tracking-[0.12em] text-accent"
          >
            <span className="truncate capitalize">{hubLabel}</span>
            <ChevronDown className="size-3.5 shrink-0 -rotate-90" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </div>
  )
}
