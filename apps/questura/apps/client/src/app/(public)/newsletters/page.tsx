import { SectionPage } from '@/features/sections/SectionPage'
import { SECTION_PAGES, sectionPageMetadata } from '@/features/sections/lib/sectionPages'

export const metadata = sectionPageMetadata(SECTION_PAGES.newsletters)

export default function NewslettersPage() {
  return <SectionPage copy={SECTION_PAGES.newsletters} />
}
