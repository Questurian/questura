'use client'

import type { JSX } from 'react'
import { PlaceCarouselCard } from '@/features/CityDashboard/components/blocks/PlaceCarouselCard'
import { useSnapCarousel } from '@/features/CityDashboard/components/blocks/useSnapCarousel'
import type { HotelCard } from '../types'
import { EditorialBoxLabel } from './EditorialBox'

// The homepage hotel grid's arrows (HotelGridPreviewContent), square ink keys.
const arrowClass =
  'flex size-9 items-center justify-center bg-foreground text-[1.3rem] leading-none text-background transition-colors hover:bg-charcoal disabled:pointer-events-none disabled:bg-foreground/15 disabled:text-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-10'

/**
 * Two or more hotel cards in a row, or a Stay List of hotels, drawn as one
 * swipeable row of the homepage hotel grid's own cards (owner, 2026-11-21:
 * photo, name, price and district in blue, up to three highlights with icons,
 * Book now). The row scrolls natively, so it works before the arrows' script
 * arrives.
 */
export function HotelCarousel({ hotels, label = 'Hotels' }: { hotels: HotelCard[]; label?: string }): JSX.Element {
  const { scrollRef, pageCount, activePage, scrollToPage, scrollByPage } = useSnapCarousel(hotels.length)
  const canScrollNext = pageCount > 0 ? activePage < pageCount - 1 : hotels.length > 1

  return (
    // No ground of its own: the row sits on the page, on the column's edges.
    <section aria-roledescription="carousel" aria-label={label}>
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
        <EditorialBoxLabel>{label}</EditorialBoxLabel>
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
          <PlaceCarouselCard
            key={`${hotel.id}-${index}`}
            title={hotel.title}
            imageUrl={hotel.image?.url ?? null}
            imageAlt={hotel.image?.alt}
            imageSizes="(min-width: 640px) 340px, 80vw"
            isPriority={false}
            isLast={index === hotels.length - 1}
            priceLevel={hotel.price}
            location={hotel.district}
            type={hotel.type}
            highlights={hotel.highlights ?? []}
            ctaHref={hotel.url}
            ctaLabel={hotel.urlKind === 'map' ? 'See on map' : 'Book now'}
            ctaExternal
            widthClassName="w-[80%] 480:w-[62%] sm:w-[46%]"
          />
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
