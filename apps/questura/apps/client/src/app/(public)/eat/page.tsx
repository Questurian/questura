import { SectionPage, sectionPageMetadataFor } from '@/features/sections/SectionPage'
import { SECTION_PAGES } from '@/features/sections/lib/sectionPages'

export function generateMetadata() {
  return sectionPageMetadataFor('eat')
}

export default function EatPage() {
  return <SectionPage copy={SECTION_PAGES.eat} page="eat" />
}
