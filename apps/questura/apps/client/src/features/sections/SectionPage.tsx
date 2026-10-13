import {
  CityHomepageContent,
  curatedHomepage,
  fetchSectionPage,
} from '@/features/CityDashboard'
import type { SectionPageKey } from '@/features/CityDashboard/lib/fetchCityHomepage'

/**
 * A navbar section's page (Eat, Stay, Itineraries, Newsletters). Eat, Stay and
 * Itineraries are curated in the ABW homepage tool like the main homepage:
 * their published blocks render under the heading with the city homepage's
 * components. Until a page is published it is the heading alone.
 */
export async function SectionPage({ title, page }: { title: string; page?: SectionPageKey }) {
  const data = page ? curatedHomepage(await fetchSectionPage(page)) : null

  return (
    <section className="min-h-[70vh] bg-background text-foreground">
      <div className="px-5 py-16 768:px-10 1024:px-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-[48px] font-medium leading-[0.95] text-foreground 480:text-[64px] 768:text-[84px]">
            {title}
          </h1>
        </div>
      </div>
      {data ? <CityHomepageContent pageBlocks={data.pageBlocks} /> : null}
    </section>
  )
}
