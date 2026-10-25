import type { JSX } from 'react'
import { PublicImage } from '@/components/media/PublicImage'
import type { HotelCardBlock } from '../types'
import { photoCredit } from '../lib/photoCredit'
import { EditorialLabelRule } from './EditorialRule'
import { PhotoCreditLine } from './PhotoCreditLine'

/** Saved hotel: a photo beside its details, on the article's paper. */
export function HotelCardBlockRenderer({ block }: { block: HotelCardBlock }): JSX.Element | null {
  const hotel = block.hotel
  if (!hotel) return null

  const titleHover = hotel.url
    ? 'group-hover:text-accent group-has-[a:focus-visible]:text-accent'
    : ''

  return (
    <aside className="border-y border-foreground/20 py-5 sm:py-6">
      <EditorialLabelRule reading className="mb-4">{hotel.type ?? 'Hotel'}</EditorialLabelRule>
      <div className={`group relative grid gap-4 sm:gap-6 ${hotel.image ? 'sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]' : ''}`}>
        {hotel.image ? (
          <div className="min-w-0">
            <div className="overflow-hidden bg-paper">
              <PublicImage
                src={hotel.image.url}
                alt={hotel.image.alt}
                width={hotel.image.width ?? 1600}
                height={hotel.image.height ?? 900}
                sizes="(min-width: 640px) 440px, 100vw"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <PhotoCreditLine credit={photoCredit(hotel.image)} className="z-[1] pt-2" />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-col justify-center">
          <div className="min-w-0">
            <h3
              className={`font-display text-[20px] font-semibold leading-[1.25] text-foreground sm:text-[24px] ${titleHover}`}
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
            {hotel.district ? (
              <p className="mt-1.5 text-[13px] leading-snug text-foreground/60 sm:text-[14px]">
                {hotel.district}
              </p>
            ) : null}
            {hotel.price ? (
              <p className="mt-3 text-[13px] font-semibold leading-none text-foreground/70 sm:text-[14px]">
                <span aria-hidden>{hotel.price}</span>
                <span className="sr-only">Price level {hotel.price.length} of 4</span>
              </p>
            ) : null}
          </div>
          {hotel.url ? <span aria-hidden className="mt-5 font-[family-name:var(--font-dm-sans)] text-[13px] font-medium text-accent underline underline-offset-4">Visit hotel website</span> : null}
        </div>
      </div>
    </aside>
  )
}
