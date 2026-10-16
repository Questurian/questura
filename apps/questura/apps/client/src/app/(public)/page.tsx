import type { Metadata } from 'next'
import { SuspenseBoundary } from '@/components/shared/SuspenseBoundary'
import { SignInPromptFromLink } from '@/features/Auth/components/SignInPromptFromLink'
import {
  CityHomepageContent,
  curatedHomepage,
  fetchMainHomepage,
} from '@/features/CityDashboard'

// Only the homepage's. The root layout's shorter one stays for the pages that
// inherit it; this one was short enough that Google padded the snippet with
// navbar text.
export const metadata: Metadata = {
  description:
    'Curated city guides, travel maps and itineraries: where to eat, drink, stay and explore in Lima and across Latin America, with new cities on the way.',
}

/**
 * The homepage. It used to redirect every visitor to /peru/lima (and the
 * middleware sent returning readers to the last city they opened). Its blocks
 * are the Main Homepage the studio publishes, rendered with the same
 * components as a city homepage. Until that is published it is an empty page.
 */
export default async function HomePage() {
  const data = curatedHomepage(await fetchMainHomepage())

  return (
    <section aria-label="Questurian" className="min-h-[70vh] bg-background">
      {/* The page's one <h1>. The blocks have no slot for a page title, so it
          is visually hidden, like a city homepage's. */}
      <h1 className="sr-only">Questurian — Curated City Guides, Maps &amp; Itineraries</h1>
      {/* Members' pages send a signed-out reader here to sign in. */}
      <SuspenseBoundary fallback={null}>
        <SignInPromptFromLink />
      </SuspenseBoundary>
      {data ? <CityHomepageContent pageBlocks={data.pageBlocks} opensPage /> : null}
    </section>
  )
}
