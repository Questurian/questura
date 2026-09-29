import type { Metadata } from 'next'

import { SectionPage } from '@/features/sections/SectionPage'

export const metadata: Metadata = {
  title: 'Itineraries — Questurian',
  description: 'Day-by-day itineraries from Questurian.',
  alternates: { canonical: '/itineraries' },
}

export default function ItinerariesPage() {
  return <SectionPage title="Itineraries" />
}
