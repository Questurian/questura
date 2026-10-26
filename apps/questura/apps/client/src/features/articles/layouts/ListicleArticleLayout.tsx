'use client'

import type { CSSProperties, JSX, ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { LISTICLE_MAP_PILL_CLEARANCE } from '@/features/articles/components/ListicleMapModes'
import { useListicleMapSync } from '@/features/articles/components/ListicleMapSync'
import { MapPanel } from '@/features/articles/components/MapPanel'
import { RelatedListicleShelf } from '@/features/articles/components/RelatedListicleShelf'
import type { RelatedMapsArticleTeaser } from '@/features/articles/lib/fetchRelatedMapsArticles'
import { useIsDesktopMap } from '@/features/articles/lib/useIsDesktopMap'
import { useDevStore } from '@/lib/stores/devStore'

interface ListicleArticleLayoutProps {
  children: JSX.Element
  relatedArticles: RelatedMapsArticleTeaser[]
  /** Links for the foot of the article; the list is the last thing above it. */
  footer?: ReactNode
  country: string
  city?: string | null
  format?: 'maps' | 'itinerary'
}

// The phone map sheet draws nothing until the browser has measured the
// viewport, so it never needed to be in the page's first JavaScript. Loading
// it after hydration keeps the sheet, its venue card and its swipe handling
// out of the maps and itinerary pages' first-load budget.
const ListicleMapSheet = dynamic(
  () =>
    import('@/features/articles/components/ListicleMapSheet').then(
      (module) => module.ListicleMapSheet,
    ),
  { ssr: false },
)

const listicleLayoutStyle = {
  '--maps-card-inset': '32px',
  '--maps-map-gutter': '24px',
  '--maps-divider-color': 'rgb(26 26 26 / 0.28)',
  '--maps-divider-offset': '-4.5px',
} as CSSProperties

export function ListicleArticleLayout({
  children,
  relatedArticles,
  footer,
  country,
  city,
  format = 'itinerary',
}: ListicleArticleLayoutProps): JSX.Element {
  const { mapsEnabled } = useDevStore()
  const isDesktopMap = useIsDesktopMap()
  // Below 1024 the map lives in a bottom sheet instead of a side column. The
  // two never coexist: a CSS-hidden column would still mount MapPanel, and
  // that instantiates a billed google.maps.Map nothing can display.
  const showMapColumn = mapsEnabled && isDesktopMap
  const showMapSheet = mapsEnabled && !isDesktopMap
  // Only the sheet takes guides: desktop reaches the same links through the
  // shelf under the map column and the section at the foot of the article.
  const guides = { articles: relatedArticles, country, city }
  // A non-member's shelf is locked like the prose beside it: whited out into
  // the page and out of reach. Their guides are locked too.
  const { access } = useListicleMapSync()
  const shelfLocked = access === 'teaser'

  return (
    <>
      <link rel="preconnect" href="https://www.instagram.com" />
      <link
        rel="preconnect"
        href="https://www.cdninstagram.com"
        crossOrigin="anonymous"
      />
      <link rel="dns-prefetch" href="https://platform.instagram.com" />
      {/* Warm the embed.js download in parallel with hydration; the runtime
          loader in InstagramEmbedBlock then hits the HTTP cache. */}
      <link
        rel="preload"
        href="https://www.instagram.com/embed.js"
        as="script"
      />
      <div
        data-article-layout="listicle"
        data-listicle-format={format}
        className="relative 1024:max-w-[1600px] 1024:mx-auto"
        style={listicleLayoutStyle}
      >
        {/* The two columns are a row of their own so the sticky map is bound
            by the list: it stops travelling where the last item ends, and
            what comes after runs the full width under both. */}
        <div className="relative 1024:flex 1024:min-h-screen">
          <div className="maps-article-column 1024:min-w-0 1024:pt-[25px]">
            {children}
          </div>
          {showMapColumn && (
            <div
              aria-hidden="true"
              className="maps-map-divider hidden 1024:block 1024:absolute 1024:top-[25px] 1024:bottom-0 1024:z-20 1024:w-px 1024:pointer-events-none"
            />
          )}
          {/* A non-member's map is a picture they cannot use, so it does not
              stay pinned while the prose moves: it runs the height of the
              article beside it, and the two end level and leave together. */}
          {showMapColumn && (
            <div
              data-map-locked={shelfLocked ? '' : undefined}
              className={`maps-map-column hidden 1024:flex 1024:flex-col ${shelfLocked ? '' : '1024:sticky 1024:self-start'}`}
            >
              <div className="flex-1 min-h-0">
                {/* No guides menu here: the shelf under this map already shows
                    the same links. The menu exists for the phone takeover,
                    which has no shelf. */}
                <MapPanel />
              </div>
              {shelfLocked ? (
                <div inert className="relative shrink-0 select-none">
                  <RelatedListicleShelf
                    articles={relatedArticles}
                    country={country}
                    city={city}
                  />
                  {/* Whited out to the page ground, as the prose column
                      ends: phones have no shelf, so nothing here is on
                      offer. It keeps its height so the map ends where the
                      article does. */}
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 bg-background" />
                </div>
              ) : (
                <RelatedListicleShelf
                  articles={relatedArticles}
                  country={country}
                  city={city}
                />
              )}
            </div>
          )}
        </div>
        {footer}
        {showMapSheet ? (
          <div
            aria-hidden="true"
            style={{
              height: `calc(${LISTICLE_MAP_PILL_CLEARANCE}px + env(safe-area-inset-bottom))`,
            }}
          />
        ) : null}
        {showMapSheet ? <ListicleMapSheet guides={guides} /> : null}
      </div>
    </>
  )
}
