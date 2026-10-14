import type { Metadata } from 'next'
import type { ReactNode } from 'react'

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
import { SECTION_PAGES, sectionPageMetadata, type SectionKey, type SectionPageCopy } from './lib/sectionPages'
import { SectionIcon } from './SectionIcon'

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
 *
 * The <h1> is set in the editorial serif's italic, not the display face: the
 * one-word title in the same Playfair as every headline read as a label. The
 * kicker carries the section's line icon in the accent blue.
 */
export async function SectionPage({
  copy,
  page,
  children,
}: {
  copy: SectionPageCopy
  page?: SectionPageKey
  /** Page-specific content under the masthead (the Newsletters signup). */
  children?: ReactNode
}) {
  const data = page ? curatedHomepage(await fetchSectionPage(page)) : null
  const section = copy.path.slice(1) as SectionKey
  const blocks = data?.pageBlocks ?? []

  return (
    <section aria-labelledby="section-page-title" className="min-h-[70vh] bg-background text-foreground">
      <JsonLd data={buildSectionPageJsonLd(copy, blocks, getPublicBaseUrl())} />
      <BlockSection contentClassName="pt-10 768:pt-14 1024:pt-16">
        <header className="grid gap-4 pb-8 768:pb-10 1024:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] 1024:items-end 1024:gap-12 1280:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
          <div>
            {copy.kicker ? (
              <p className={`mb-3 flex items-center gap-2.5 768:mb-4 ${BLOCK_TYPE.kicker}`}>
                {section in SECTION_PAGES ? (
                  <SectionIcon section={section} className="size-[1.75em] shrink-0" />
                ) : null}
                {copy.kicker}
              </p>
            ) : null}
            {/* -0.03em pulls the italic's left side-bearing back so the first
                letter's ink, not its box, sits on the kicker icon's edge. */}
            <h1
              id="section-page-title"
              className="-ml-[0.03em] font-[family-name:var(--font-editorial-serif)] text-[4.75rem] font-medium italic leading-[0.86] tracking-[-0.015em] text-foreground 480:text-[5.75rem] 768:text-[7.5rem] 1024:text-[8.75rem]"
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
      {children}
      {data ? <CityHomepageContent pageBlocks={data.pageBlocks} /> : null}
    </section>
  )
}
