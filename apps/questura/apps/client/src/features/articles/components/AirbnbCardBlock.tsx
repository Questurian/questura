import type { JSX } from 'react'
import { ArrowUpRight, House, MapPin, Star } from 'lucide-react'
import type { AirbnbCard, AirbnbCardBlock } from '../types'
import type { ListicleItemImage } from '../lib/listicleItemHelpers'
import { photoCredit } from '../lib/photoCredit'
import { withoutListNumber } from '../lib/stayBoxes'
import { editorialKickerClass } from './EditorialRule'
import { StayBoxGallery } from './StayBoxGallery'

const reviewCountFormat = new Intl.NumberFormat('en-US')

function formatReviews(count: number): string {
  return `${reviewCountFormat.format(count)} ${count === 1 ? 'review' : 'reviews'}`
}

/** Airbnb prints a whole rating with one decimal: 5.0, not 5. */
function formatRating(rating: number): string {
  return Number.isInteger(rating) ? rating.toFixed(1) : String(rating)
}

const twoDigits = (value: number): string => String(value).padStart(2, '0')

function plainText(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
}

/** The gallery's photos, or the one featured photo from an API older than the box. */
function boxPhotos(airbnb: AirbnbCard): ListicleItemImage[] {
  const images = airbnb.images ?? (airbnb.image ? [airbnb.image] : [])
  return images.map((image) => ({ url: image.url, alt: image.alt, credit: photoCredit(image) }))
}

const detailRowClass =
  'flex items-start gap-2.5 text-[13px] leading-snug text-foreground/70 [font-family:var(--font-dm-sans)] sm:text-[14px]'
const detailIconClass = 'mt-px size-[15px] shrink-0 text-accent sm:size-4'

/**
 * Airbnb Card: one stay, drawn as a box (owner decision, 2026-10-20).
 *
 * The one framed object down the column besides the header, by request: on a
 * "best Airbnbs" article each stay reads as a unit, the way a Condé Nast
 * Traveler gallery does, with the photos, the name, what the writer said about
 * it and the way to book all inside one paper box. `pairStayBoxes` hands the
 * box the section written beside the card (`lead`) and its number in the list
 * (`position`); without them it still draws the stay from the Airbnb record.
 * Data is live from that record, so the box follows edits made in Location
 * Manager.
 */
export function AirbnbCardBlockRenderer({ block }: { block: AirbnbCardBlock }): JSX.Element | null {
  const airbnb = block.airbnb
  if (!airbnb) return null

  const lead = block.lead ?? null
  const position = block.position ?? null
  const photos = boxPhotos(airbnb)
  // The box keeps the level of the heading it took in, so the outline holds.
  const Heading = lead?.level === 2 ? 'h2' : 'h3'
  const headingId = `stay-${block.id}`
  // A heading that names the stay titles the box; one that only gives an
  // angle ("Best for a long stay") sits under the Airbnb's own name.
  const headingHtml = lead && position ? withoutListNumber(lead.headingHtml) : lead?.headingHtml
  const angle = lead && !lead.namesStay && headingHtml ? plainText(headingHtml) : null
  const writeUp = lead?.html.trim() ? lead.html : null
  const titleClass =
    'mt-3 font-display text-[23px] font-semibold leading-[1.18] text-foreground sm:mt-3.5 sm:text-[29px] sm:leading-[1.14]'

  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-sm border border-foreground/15 bg-paper"
    >
      {photos.length > 0 ? <StayBoxGallery images={photos} /> : null}

      <div className={`px-4 pb-5 480:px-5 sm:px-7 sm:pb-7 ${photos.length > 0 ? 'pt-3 sm:pt-4' : 'pt-5 sm:pt-7'}`}>
        <div className="flex items-center gap-2.5">
          {position ? (
            <span className={`shrink-0 text-accent ${editorialKickerClass}`}>
              <span aria-hidden>
                {twoDigits(position.index)} / {twoDigits(position.total)}
              </span>
              <span className="sr-only">
                Stay {position.index} of {position.total}:
              </span>
            </span>
          ) : null}
          <span
            className={`min-w-0 truncate ${editorialKickerClass} ${position ? 'text-foreground/55' : 'text-accent'}`}
          >
            {airbnb.area ? `Airbnb · ${airbnb.area}` : 'Airbnb'}
          </span>
          <span aria-hidden className="h-px min-w-6 flex-1 bg-foreground/18" />
        </div>

        {headingHtml && !angle ? (
          <Heading
            id={headingId}
            className={titleClass}
            dangerouslySetInnerHTML={{ __html: headingHtml }}
          />
        ) : (
          <Heading id={headingId} className={titleClass}>
            {airbnb.title}
          </Heading>
        )}

        {angle ? (
          <p className="mt-1.5 font-display text-[16px] italic leading-snug text-accent sm:text-[18px]">
            {angle}
          </p>
        ) : null}

        {airbnb.description ? (
          <p className="mt-3 font-display text-[17px] italic leading-[1.5] text-foreground/80 sm:text-[19px] sm:leading-[1.45]">
            {airbnb.description}
          </p>
        ) : null}

        {airbnb.stayType || airbnb.near ? (
          <ul className="mt-4 space-y-2">
            {airbnb.stayType ? (
              <li className={detailRowClass}>
                <House className={detailIconClass} strokeWidth={1.75} aria-hidden />
                <span className="sr-only">The stay: </span>
                {airbnb.stayType}
              </li>
            ) : null}
            {airbnb.near ? (
              <li className={detailRowClass}>
                <MapPin className={detailIconClass} strokeWidth={1.75} aria-hidden />
                <span className="sr-only">Near: </span>
                {airbnb.near}
              </li>
            ) : null}
          </ul>
        ) : null}

        {writeUp ? (
          <div
            className="article-prose stay-box-prose mt-5"
            dangerouslySetInnerHTML={{ __html: writeUp }}
          />
        ) : null}

        <div className="mt-5 flex flex-col gap-4 border-t border-foreground/15 pt-4 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:pt-5">
          {airbnb.rating !== null || airbnb.price ? (
            <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5 text-[14px] leading-none text-foreground [font-family:var(--font-dm-sans)] sm:text-[15px]">
              {airbnb.rating !== null ? (
                <span className="inline-flex items-baseline gap-1.5">
                  <Star className="size-[13px] self-center fill-accent text-accent" strokeWidth={0} aria-hidden />
                  <span className="font-semibold">
                    <span className="sr-only">Rated </span>
                    {formatRating(airbnb.rating)}
                  </span>
                  {airbnb.reviewCount !== null ? (
                    <span className="text-foreground/55">({formatReviews(airbnb.reviewCount)})</span>
                  ) : null}
                </span>
              ) : null}
              {airbnb.price ? (
                <span className="font-display text-[17px] font-semibold sm:text-[18px]">{airbnb.price}</span>
              ) : null}
            </p>
          ) : null}
          <a
            href={airbnb.listingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 bg-foreground px-6 text-[13px] font-medium uppercase leading-none tracking-[0.12em] text-background transition-colors duration-150 ease-out [font-family:var(--font-dm-sans)] hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper motion-reduce:transition-none sm:ml-auto"
          >
            View on Airbnb
            <ArrowUpRight className="size-4" strokeWidth={1.8} aria-hidden />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </section>
  )
}
