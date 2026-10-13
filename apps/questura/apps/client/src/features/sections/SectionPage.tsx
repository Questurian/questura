import type { Metadata } from 'next'

import { JsonLd } from '@/components/seo/JsonLd'
import {
  CityHomepageContent,
  curatedHomepage,
  fetchSectionPage,
} from '@/features/CityDashboard'
import { BlockSection } from '@/features/CityDashboard/components/blocks/BlockSection'
import { BLOCK_TYPE } from '@/features/CityDashboard/components/blocks/blockType'
import type { SectionPageKey } from '@/features/CityDashboard/lib/fetchCityHomepage'
import { getPublicBaseUrl } from '@/lib/seo/publicBaseUrl'

import { buildSectionPageJsonLd, sectionPageShareImage } from './lib/sectionPageJsonLd'
import { SECTION_PAGES, sectionPageMetadata, type SectionPageCopy } from './lib/sectionPages'

/**
 * A curated section's metadata, with the first teaser photo as its share
 * image. The fetch is the same one the page makes, so Next serves it once.
 */
export async function sectionPageMetadataFor(page: SectionPageKey): Promise<Metadata> {
  const copy = SECTION_PAGES[page]
  const metadata = sectionPageMetadata(copy)
  const image = sectionPageShareImage(curatedHomepage(await fetchSectionPage(page))?.pageBlocks ?? [])
  if (!image) return metadata

  return {
    ...metadata,
    openGraph: { ...metadata.openGraph, images: [image] },
    twitter: { card: 'summary_large_image', images: [image.url] },
  }
}

/**
 * A navbar section's page (Eat, Stay, Itineraries, Newsletters). Eat, Stay and
 * Itineraries are curated in the ABW homepage tool like the main homepage:
 * their published blocks render under the masthead with the city homepage's
 * components. Until a page is published it is the masthead alone.
 *
 * The masthead sits on the block grid (BlockSection), so the <h1> lines up
 * with the first block's left edge. It draws no rule of its own: the first
 * block's hairline is the only line under it.
 */
export async function SectionPage({ copy, page }: { copy: SectionPageCopy; page?: SectionPageKey }) {
  const data = page ? curatedHomepage(await fetchSectionPage(page)) : null
  const blocks = data?.pageBlocks ?? []

  return (
    <section aria-labelledby="section-page-title" className="min-h-[70vh] bg-background text-foreground">
      <JsonLd data={buildSectionPageJsonLd(copy, blocks, getPublicBaseUrl())} />
      <BlockSection contentClassName="pt-10 768:pt-14 1024:pt-16">
        <header className="grid gap-4 pb-8 768:pb-10 1024:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] 1024:items-end 1024:gap-12 1280:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
          <div>
            {copy.kicker ? <p className={`mb-3 768:mb-4 ${BLOCK_TYPE.kicker}`}>{copy.kicker}</p> : null}
            <h1
              id="section-page-title"
              className="font-display text-[4rem] font-medium leading-[0.86] tracking-[-0.02em] text-foreground 480:text-[5rem] 768:text-[6.5rem] 1024:text-[7.5rem]"
            >
              {copy.name}
            </h1>
          </div>
          {copy.dek ? (
            <p className="max-w-[34rem] font-[family-name:var(--font-editorial-serif)] text-[1.08rem] leading-[1.45] text-foreground/75 768:text-[1.2rem] 1024:pb-2 1024:text-[1.25rem]">
              {copy.dek}
            </p>
          ) : null}
        </header>
      </BlockSection>
      {data ? <CityHomepageContent pageBlocks={data.pageBlocks} /> : null}
    </section>
  )
}
