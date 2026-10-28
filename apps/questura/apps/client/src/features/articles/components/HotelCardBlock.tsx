import type { JSX } from 'react'
import { SquareArrowOutUpRight } from 'lucide-react'
import { PublicImage } from '@/components/media/PublicImage'
import type { HotelCard, HotelCardBlock } from '../types'
import { EditorialBoxLabel } from './EditorialBox'

/**
 * District and price ticks on one quiet sans line, the ticks in blue and
 * matched to the letters (owner, 2026-10-27), measured in the browser: DM
 * Sans's "$" inks from 0.791em above the baseline to 0.087em below it (0.878em)
 * against a 0.7em cap height. At 0.797em the ticks ink exactly cap-high; lifted
 * by their own 0.087em descender their foot sits on the baseline; at weight
 * 527 (DM Sans is variable) their stroke is as wide as the regular letters'.
 */
export function HotelFacts({ hotel }: { hotel: HotelCard }): JSX.Element | null {
  if (!hotel.district && !hotel.price) return null
  return (
    <p className="text-[13px] leading-snug text-foreground/60 [font-family:var(--font-dm-sans)] sm:text-[14px]">
      {hotel.district}
      {hotel.district && hotel.price ? <span aria-hidden> · </span> : null}
      {hotel.price ? (
        <span className="align-[0.087em] text-[0.797em] font-[527] text-accent">
          <span aria-hidden>{hotel.price}</span>
          <span className="sr-only">Price level {hotel.price.length} of 4</span>
        </span>
      ) : null}
    </p>
  )
}

/** The hotel's name; with a link, it stretches over the whole card. */
export function HotelTitle({ hotel, className }: { hotel: HotelCard; className: string }): JSX.Element {
  return (
    <h3
      className={`font-display font-semibold text-foreground ${hotel.url ? 'group-hover:text-accent group-has-[a:focus-visible]:text-accent' : ''} ${className}`}
    >
      {hotel.url ? (
        <a
          href={hotel.url}
          target="_blank"
          rel="noopener noreferrer"
          className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          {hotel.title}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        hotel.title
      )}
    </h3>
  )
}

/**
 * The link's visible label, with the usual open-outside mark. Decorative: the
 * title link covers the card.
 *
 * The mark is sized to the letters, not to a box: its ink runs exactly from
 * the baseline to DM Sans's cap height (0.7em), measured in the browser. The
 * path's ink spans 18 of the icon's 24 units plus one stroke (2.5 units, about
 * the weight of the medium letters' stems), so the icon is 0.7 * 24 / 20.5 =
 * 0.82em, and the 1.75 units of air under the ink (0.06em) drop below the
 * baseline so the ink's foot sits on it.
 */
export function HotelLinkLabel({ children }: { children: string }): JSX.Element {
  return (
    <span
      aria-hidden
      className="whitespace-nowrap font-[family-name:var(--font-dm-sans)] text-[13px] font-medium text-foreground sm:text-[14px]"
    >
      {children}
      <SquareArrowOutUpRight className="ml-[0.4em] inline-block size-[0.82em] align-[-0.06em]" strokeWidth={2.5} />
    </span>
  )
}

/**
 * Saved hotel: a paper box, the photo beside its details. Two or more in a
 * row are drawn as one carousel instead (`HotelCarousel`, ArticleBlockStream).
 */
export function HotelCardBlockRenderer({ block }: { block: HotelCardBlock }): JSX.Element | null {
  const hotel = block.hotel
  if (!hotel) return null

  return (
    <aside className={`group relative grid bg-paper ${hotel.image ? 'sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]' : ''}`}>
      {hotel.image ? (
        <div className="min-w-0">
          <PublicImage
            src={hotel.image.url}
            alt={hotel.image.alt}
            width={hotel.image.width ?? 1600}
            height={hotel.image.height ?? 900}
            sizes="(min-width: 640px) 440px, 100vw"
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col justify-center px-5 py-6 480:px-6 sm:px-7 sm:py-7">
        <EditorialBoxLabel className="mb-3">{hotel.type ?? 'Hotel'}</EditorialBoxLabel>
        <HotelTitle hotel={hotel} className="text-[21px] leading-[1.25] sm:text-[24px]" />
        <div className="mt-1.5">
          <HotelFacts hotel={hotel} />
        </div>
        {hotel.url ? (
          <div className="mt-5">
            <HotelLinkLabel>Visit hotel website</HotelLinkLabel>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
