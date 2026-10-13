import { SectionPage, sectionPageMetadataFor } from '@/features/sections/SectionPage'
import { SECTION_PAGES } from '@/features/sections/lib/sectionPages'

export function generateMetadata() {
  return sectionPageMetadataFor('stay')
}

export default function StayPage() {
  return <SectionPage copy={SECTION_PAGES.stay} page="stay" />
}
