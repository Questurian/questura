import type { JSX } from 'react'
import type { HotelListBlock } from '../types'
import { EditorialBoxLabel } from './EditorialBox'
import { HotelCardBox } from './HotelCardBlock'
import { HotelCarouselLazy } from './HotelCarouselLazy'

/**
 * A Hotel List: the carousel, or the lone card's paper box once per hotel
 * under the list's heading. A list left with one hotel draws that card alone.
 */
export function HotelListBlockRenderer({ block }: { block: HotelListBlock }): JSX.Element | null {
  const label = block.label ?? 'Hotels'
  if (block.hotels.length === 0) return null
  if (block.hotels.length === 1) return <HotelCardBox hotel={block.hotels[0]} />
  if (block.display === 'carousel') return <HotelCarouselLazy hotels={block.hotels} label={label} />

  return (
    <section aria-label={label}>
      <EditorialBoxLabel className="mb-4 sm:mb-5">{label}</EditorialBoxLabel>
      <div className="flex flex-col gap-4 sm:gap-5">
        {block.hotels.map((hotel, index) => (
          <HotelCardBox key={`${hotel.id}-${index}`} hotel={hotel} />
        ))}
      </div>
    </section>
  )
}
