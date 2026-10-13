import { SectionPage, sectionPageMetadataFor } from '@/features/sections/SectionPage'
import { SECTION_PAGES } from '@/features/sections/lib/sectionPages'

export function generateMetadata() {
  return sectionPageMetadataFor('itineraries')
}

export default function ItinerariesPage() {
  return <SectionPage copy={SECTION_PAGES.itineraries} page="itineraries" />
}
