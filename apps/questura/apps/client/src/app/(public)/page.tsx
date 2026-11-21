import type { Metadata } from 'next'
import { SITE_SHARE_IMAGE } from '@/lib/seo/siteShareCard'
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
const description =
  'Curated travel guides, maps and itineraries for Peru, starting with where to eat, drink, stay and explore in Lima.'

// questurian.com is the link people paste, so it needs the full card
// (2026-11-21: it had no og tags at all and previewed as a bare link).
export const metadata: Metadata = {
  description,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Questurian',
    title: 'Questurian',
    description,
    url: '/',
    images: [SITE_SHARE_IMAGE],
  },
  twitter: { card: 'summary_large_image', title: 'Questurian', description, images: [SITE_SHARE_IMAGE] },
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
