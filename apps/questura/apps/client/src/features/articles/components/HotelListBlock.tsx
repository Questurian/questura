import type { JSX } from 'react'
import { Star } from 'lucide-react'
import { PublicImage } from '@/components/media/PublicImage'
import type { HotelListBlock, StayListItem } from '../types'
import { EditorialBox } from './EditorialBox'
import { HotelFacts, HotelLinkLabel, HotelTitle } from './HotelCardBlock'

/** Airbnb prints a whole rating with one decimal: 5.0, not 5. */
const formatRating = (rating: number): string => (Number.isInteger(rating) ? rating.toFixed(1) : String(rating))

/** District and price ticks for a hotel; district and stars for an Airbnb. */
function StayFacts({ stay }: { stay: StayListItem }): JSX.Element | null {
  if (stay.kind === 'hotel') return <HotelFacts hotel={stay} />
  if (!stay.district && stay.rating === null) return null
  return (
    <p className="text-[13px] leading-snug text-foreground/60 [font-family:var(--font-dm-sans)] sm:text-[14px]">
      {stay.district}
      {stay.district && stay.rating !== null ? <span aria-hidden> · </span> : null}
      {stay.rating !== null ? (
        <span className="whitespace-nowrap text-foreground">
          <Star className="mr-1 inline-block size-[0.8em] fill-accent align-[-0.02em] text-accent" strokeWidth={0} aria-hidden />
          <span className="sr-only">Rated </span>
          {formatRating(stay.rating)}
        </span>
      ) : null}
    </p>
  )
}

function StayRow({ stay }: { stay: StayListItem }): JSX.Element {
  return (
    <li className="group relative grid grid-cols-[72px_minmax(0,1fr)] items-center gap-x-4 py-4 first:pt-0 last:pb-0 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:gap-x-5">
      {stay.image ? (
        <PublicImage
          src={stay.image.url}
          alt={stay.image.alt}
          width={192}
          height={192}
          sizes="96px"
          className="aspect-square w-full object-cover"
        />
      ) : (
        <div aria-hidden className="aspect-square w-full bg-background-warm" />
      )}
      <div className="min-w-0">
        {/* A hotel's type tells hotels apart (Hostel, Boutique Hotel); every
            row of an Airbnb list would only repeat what the heading says. */}
        {stay.kind === 'hotel' ? (
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/50 [font-family:var(--font-dm-sans)]">
            {stay.type ?? 'Hotel'}
          </p>
        ) : null}
        <HotelTitle hotel={stay} className="text-[17px] leading-[1.25] sm:text-[19px]" />
        <div className="mt-1">
          <StayFacts stay={stay} />
        </div>
        {stay.url ? (
          <div className="mt-2 sm:hidden">
            <HotelLinkLabel>{stay.kind === 'airbnb' ? 'View on Airbnb' : 'Visit website'}</HotelLinkLabel>
          </div>
        ) : null}
      </div>
      {stay.url ? (
        <div className="hidden sm:block">
          <HotelLinkLabel>{stay.kind === 'airbnb' ? 'View on Airbnb' : 'Visit website'}</HotelLinkLabel>
        </div>
      ) : null}
    </li>
  )
}

/**
 * A Stay List (owner, 2026-10-28): the hotels, or the Airbnbs, in one paper
 * box, one compact row each (square photo, name, facts, link), so a long list
 * reads like a guidebook index rather than a wall of cards. An article keeps
 * its hotel list and its Airbnb list apart.
 */
export function HotelListBlockRenderer({ block }: { block: HotelListBlock }): JSX.Element | null {
  if (block.stays.length === 0) return null
  return (
    <EditorialBox
      as="section"
      label={block.label ?? (block.stays.every((stay) => stay.kind === 'airbnb') ? 'Airbnbs' : 'Hotels')}
    >
      <ul className="divide-y divide-foreground/15">
        {block.stays.map((stay, index) => (
          <StayRow key={`${stay.kind}-${stay.id}-${index}`} stay={stay} />
        ))}
      </ul>
    </EditorialBox>
  )
}
