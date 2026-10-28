'use client'

import type { JSX } from 'react'
import dynamic from 'next/dynamic'
import type { HotelCard } from '../types'

/**
 * Its own chunk, still drawn on the server, for the same reason as
 * `StayBoxGallery`: article pages sit at the first-load JavaScript cap
 * (perf/budgets.json), and only an article with hotels in a row needs it.
 */
const HotelCarousel = dynamic(() => import('./HotelCarousel').then((module) => module.HotelCarousel), {
  loading: () => <div aria-hidden="true" className="h-[420px] bg-paper sm:h-[460px]" />,
})

export function HotelCarouselLazy({ hotels }: { hotels: HotelCard[] }): JSX.Element {
  return <HotelCarousel hotels={hotels} />
}
