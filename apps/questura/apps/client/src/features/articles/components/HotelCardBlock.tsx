import type { JSX } from 'react'
import { PublicImage } from '@/components/media/PublicImage'
import type { HotelCardBlock } from '../types'
import { photoCredit } from '../lib/photoCredit'
import { EditorialLabelRule } from './EditorialRule'
import { PhotoCreditLine } from './PhotoCreditLine'

/**
 * Circular arrow that draws its ring on hover, as on Tour Picks. The draw is
 * keyed to `.listicle-tour-card` on the card (membership.css).
 */
function BookRing(): JSX.Element {
  return (
    <span
      className="grid size-10 shrink-0 place-items-center text-foreground/45 transition-colors group-hover:text-accent group-has-[a:focus-visible]:text-accent"
      aria-hidden
    >
      <svg viewBox="0 0 40 40" fill="none" className="h-full w-full">
        <circle className="listicle-tour-ring-track" cx="20" cy="20" r="18" strokeWidth="1.5" />
        <circle
          className="listicle-tour-ring-progress"
          cx="20"
          cy="20"
          r="18"
          pathLength="100"
          strokeWidth="1.5"
        />
        <path
          d="M14 20h11M20 15l5 5-5 5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

/**
 * Hotel Card: one saved accommodation inside a standard article. The sibling
 * of the Airbnb Card: a kicker on a hairline, a wide photo and type, not a
 * framed card. The whole unit links out when the hotel has a link (the title's
 * link stretches over the card, so the photo credit's Source button stays its
 * own control); without one it is still shown, as plain type. Data is live
 * from the accommodation record.
 */
export function HotelCardBlockRenderer({ block }: { block: HotelCardBlock }): JSX.Element | null {
  const hotel = block.hotel
  if (!hotel) return null

  const titleHover = hotel.url
    ? 'group-hover:text-accent group-has-[a:focus-visible]:text-accent'
    : ''

  return (
    <aside className="py-4 sm:py-5">
      <EditorialLabelRule className="mb-5">Stay · {hotel.type ?? 'Hotel'}</EditorialLabelRule>
      <div className={hotel.url ? 'listicle-tour-card group relative' : undefined}>
        {hotel.image ? (
          <>
            <div className="-mx-4 overflow-hidden bg-foreground/[0.06] 1024:mx-0">
              <PublicImage
                src={hotel.image.url}
                alt={hotel.image.alt}
                width={hotel.image.width ?? 1600}
                height={hotel.image.height ?? 900}
                sizes="(min-width: 1024px) 880px, (min-width: 768px) 760px, 100vw"
                className="aspect-[16/9] w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02] motion-reduce:transform-none"
              />
            </div>
            <PhotoCreditLine credit={photoCredit(hotel.image)} className="z-[1] pt-2" />
          </>
        ) : null}

        <div className={`flex items-start gap-4 ${hotel.image ? 'pt-4 sm:pt-5' : ''}`}>
          <div className="min-w-0 flex-1">
            <h3
              className={`font-display text-[20px] font-semibold leading-[1.25] text-foreground sm:text-[24px] ${titleHover}`}
            >
              {hotel.url ? (
                <a
                  href={hotel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="after:absolute after:inset-0 focus-visible:outline-none"
                >
                  {hotel.title}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                hotel.title
              )}
            </h3>
            {hotel.district ? (
              <p className="mt-1.5 text-[13px] leading-snug text-foreground/60 sm:text-[14px]">
                {hotel.district}
              </p>
            ) : null}
            {hotel.price ? (
              <p className="mt-3 text-[13px] font-semibold leading-none text-accent sm:text-[14px]">
                <span aria-hidden>{hotel.price}</span>
                <span className="sr-only">Price level {hotel.price.length} of 4</span>
              </p>
            ) : null}
          </div>
          {hotel.url ? <BookRing /> : null}
        </div>
      </div>
      <div aria-hidden className="mt-6 h-px bg-foreground/15" />
    </aside>
  )
}
