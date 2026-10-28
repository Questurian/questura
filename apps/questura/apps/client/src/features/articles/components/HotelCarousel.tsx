'use client'

import type { JSX } from 'react'
import { PublicImage } from '@/components/media/PublicImage'
import { useSnapCarousel } from '@/features/CityDashboard/components/blocks/useSnapCarousel'
import type { HotelCard } from '../types'
import { EditorialBoxLabel } from './EditorialBox'
import { HotelFacts, HotelLinkLabel, HotelTitle } from './HotelCardBlock'

// The homepage hotel grid's arrows (HotelGridPreviewContent), square ink keys.
const arrowClass =
  'flex size-9 items-center justify-center bg-foreground text-[1.3rem] leading-none text-background transition-colors hover:bg-charcoal disabled:pointer-events-none disabled:bg-foreground/15 disabled:text-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-10'

/**
 * Two or more hotel cards in a row, drawn as one swipeable row (owner
 * request, 2026-10-27): the in-article form of the homepage hotel grid. The
 * row scrolls natively, so it works before the arrows' script arrives.
 */
export function HotelCarousel({ hotels }: { hotels: HotelCard[] }): JSX.Element {
  const { scrollRef, pageCount, activePage, scrollToPage, scrollByPage } = useSnapCarousel(hotels.length)
  const canScrollNext = pageCount > 0 ? activePage < pageCount - 1 : hotels.length > 1

  return (
    // No ground of its own: the row sits on the page, on the column's edges.
    <section aria-roledescription="carousel" aria-label="Hotels">
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
        <EditorialBoxLabel>Hotels</EditorialBoxLabel>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={() => scrollByPage(-1)} disabled={activePage === 0} aria-label="Previous hotels" className={arrowClass}>
            ‹
          </button>
          <button type="button" onClick={() => scrollByPage(1)} disabled={!canScrollNext} aria-label="Next hotels" className={arrowClass}>
            ›
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        // useSnapCarousel reads each card's offsetLeft from this scroll viewport.
        className="relative flex snap-x snap-mandatory gap-3 overflow-x-auto [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden"
      >
        {hotels.map((hotel, index) => (
          <article
            key={`${hotel.id}-${index}`}
            aria-label={`${index + 1} of ${hotels.length}`}
            className="group relative flex w-[80%] shrink-0 snap-start flex-col 480:w-[62%] sm:w-[44%]"
          >
            {hotel.image ? (
              <PublicImage
                src={hotel.image.url}
                alt={hotel.image.alt}
                width={720}
                height={540}
                sizes="(min-width: 640px) 360px, 80vw"
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div aria-hidden className="aspect-[4/3] w-full bg-background-warm" />
            )}
            {/* The section is "Hotels", so the card carries no type label of its own. */}
            <div className="flex flex-1 flex-col pt-3.5">
              <HotelTitle hotel={hotel} className="text-[18px] leading-[1.28] sm:text-[20px]" />
              <div className="mt-1.5">
                <HotelFacts hotel={hotel} />
              </div>
              {hotel.url ? (
                <div className="mt-auto pt-3">
                  <HotelLinkLabel>Visit website</HotelLinkLabel>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {pageCount > 1 ? (
        <div className="mt-5 flex justify-center gap-2.5">
          {Array.from({ length: pageCount }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => scrollToPage(index)}
              aria-label={`Go to page ${index + 1}`}
              aria-current={index === activePage ? 'true' : undefined}
              className={`size-2 rounded-full transition-colors duration-200 ${index === activePage ? 'bg-foreground' : 'bg-foreground/20'}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
