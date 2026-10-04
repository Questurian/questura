import type { JSX } from 'react'
import { Star } from 'lucide-react'
import { PublicImage } from '@/components/media/PublicImage'
import type { AirbnbCardBlock } from '../types'
import { EditorialLabelRule } from './EditorialRule'

/**
 * Circular arrow that draws its ring on hover, as on Tour Picks. The draw is
 * keyed to `.listicle-tour-card` on the link (membership.css).
 */
function BookRing(): JSX.Element {
  return (
    <span
      className="grid size-10 shrink-0 place-items-center text-foreground/45 transition-colors group-hover:text-accent group-focus-visible:text-accent"
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

const reviewCountFormat = new Intl.NumberFormat('en-US')

function formatReviews(count: number): string {
  return `${reviewCountFormat.format(count)} ${count === 1 ? 'review' : 'reviews'}`
}

/**
 * Airbnb Card: one saved Airbnb inside a standard article. Like the other
 * editorial blocks it is not a framed card; it interrupts the column with a
 * kicker on a hairline, a wide photo and type, and the whole unit links out to
 * the listing. Data is live from the Airbnb record, so the card follows edits.
 */
export function AirbnbCardBlockRenderer({ block }: { block: AirbnbCardBlock }): JSX.Element | null {
  const airbnb = block.airbnb
  if (!airbnb) return null

  const meta = [airbnb.stayType, airbnb.near].filter(Boolean).join(' · ')
  const hasRating = airbnb.rating !== null

  return (
    <aside className="py-4 sm:py-5">
      <EditorialLabelRule className="mb-5">Stay · Airbnb</EditorialLabelRule>
      <a
        href={airbnb.listingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="listicle-tour-card group block focus-visible:outline-none"
      >
        {airbnb.image ? (
          <div className="-mx-4 overflow-hidden bg-foreground/[0.06] 1024:mx-0">
            <PublicImage
              src={airbnb.image.url}
              alt={airbnb.image.alt}
              width={airbnb.image.width ?? 1600}
              height={airbnb.image.height ?? 900}
              sizes="(min-width: 1024px) 880px, (min-width: 768px) 760px, 100vw"
              className="aspect-[16/9] w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02] motion-reduce:transform-none"
            />
          </div>
        ) : null}

        <div className={`flex items-start gap-4 ${airbnb.image ? 'pt-4 sm:pt-5' : ''}`}>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[20px] font-semibold leading-[1.25] text-foreground group-hover:text-accent group-focus-visible:text-accent sm:text-[24px]">
              {airbnb.title}
            </h3>
            {meta ? (
              <p className="mt-1.5 text-[13px] leading-snug text-foreground/60 sm:text-[14px]">{meta}</p>
            ) : null}
            {airbnb.description ? (
              <p className="mt-3 font-display text-[15px] leading-[1.72] text-foreground/80 sm:text-[17px] sm:leading-[1.7]">
                {airbnb.description}
              </p>
            ) : null}
            {hasRating || airbnb.price ? (
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold leading-none text-accent sm:text-[14px]">
                {hasRating ? (
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-[13px] fill-current" strokeWidth={0} aria-hidden />
                    {airbnb.rating}
                    {airbnb.reviewCount !== null ? (
                      <span className="font-normal text-foreground/55">
                        ({formatReviews(airbnb.reviewCount)})
                      </span>
                    ) : null}
                  </span>
                ) : null}
                {airbnb.price ? <span>{airbnb.price}</span> : null}
              </p>
            ) : null}
          </div>
          <BookRing />
        </div>
        <span className="sr-only">View on Airbnb (opens in a new tab)</span>
      </a>
      <div aria-hidden className="mt-6 h-px bg-foreground/15" />
    </aside>
  )
}
