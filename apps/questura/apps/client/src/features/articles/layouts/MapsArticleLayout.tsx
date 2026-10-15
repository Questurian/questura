'use client'

import { useMemo, type JSX, type ReactNode } from 'react'
import { MapsListicleArticlePage } from '@/features/articles/MapsListicleArticlePage'
import {
  ListicleMapSyncProvider,
  type ListicleMapPoint,
} from '@/features/articles/components/ListicleMapSync'
import type { ListicleMomentHeadings } from '@/features/articles/components/ListicleMomentHeading'
import { GatedBodySkeleton, GatedLoadError } from '@/features/articles/components/GatedStates'
import { ListicleArticleLayout } from '@/features/articles/layouts/ListicleArticleLayout'
import type { GateState } from '@/features/articles/lib/gate'
import { mapPointPreviewFromRow } from '@/features/articles/lib/listicleMapPreview'
import { useGatedFullArticle } from '@/features/articles/lib/useGatedFullArticle'
import type { ListicleFooterLinks } from '@/features/articles/lib/fetchListicleFooterLinks'
import type { RelatedMapsArticleTeaser } from '@/features/articles/lib/fetchRelatedMapsArticles'
import type { MapsListicleArticle } from '@/features/articles/types/mapsListicle'

interface MapsArticleLayoutProps {
  article: MapsListicleArticle
  momentHeadings: ListicleMomentHeadings
  relatedArticles: RelatedMapsArticleTeaser[]
  footerLinks?: ListicleFooterLinks | null
  country: string
  city?: string | null
  /** `readGate(article)`, read on the server. */
  gate: GateState | null
  /**
   * The paywall notice for a locked list, rendered on the server: it does not
   * depend on who is reading, and its code stays out of this page's first-load
   * JavaScript, which is over the cap (perf/budgets.json).
   */
  paywallNotice?: ReactNode
}

export function MapsArticleLayout({
  article,
  momentHeadings,
  relatedArticles,
  footerLinks,
  country,
  city,
  gate,
  paywallNotice = null,
}: MapsArticleLayoutProps): JSX.Element {
  // `gate` comes from the server once, so `gate.mapPins` keeps one identity
  // across renders: a fresh array would rebuild every marker and re-frame the
  // camera each time the points are derived.
  const locked = gate?.locked === true

  // A locked list arrives cut to its first places. A member's full list
  // re-enters here, where the map points are derived, so the list, the pins
  // and the scroll sync all agree.
  const { phase, data, retry } = useGatedFullArticle<MapsListicleArticle>({
    articleId: article.id,
    type: 'maps',
    enabled: locked,
  })

  const effectiveArticle = locked && phase === 'ready' && data ? data : article
  const paywalled = Boolean(locked && gate) && (phase === 'identifying' || phase === 'anonymous')
  // Places the server withheld, as positions only. Dropped the moment the full
  // list is in, because that list draws the same places as real pins.
  const lockedPins = locked && effectiveArticle === article ? gate?.mapPins : undefined

  const points = useMemo(() => {
    const rows = effectiveArticle.items ?? []
    const result: ListicleMapPoint[] = []
    rows.forEach((row, index) => {
      const { latitude, longitude, title } = row.item
      if (typeof latitude !== 'number' || typeof longitude !== 'number') return
      result.push({
        id: row.id,
        index,
        title,
        lat: latitude,
        lng: longitude,
        preview: mapPointPreviewFromRow(row),
      })
    })

    // Numbered after the places on the page, so the pins read as the rest of
    // the same list; inert, because there is nothing on the page to scroll to.
    lockedPins?.forEach((pin, offset) => {
      result.push({
        id: `locked-place-${offset}`,
        index: rows.length + offset,
        title: '',
        lat: pin.lat,
        lng: pin.lng,
        inert: true,
      })
    })

    return result
  }, [effectiveArticle, lockedPins])

  return (
    <ListicleMapSyncProvider points={points}>
      <ListicleArticleLayout
        format="maps"
        relatedArticles={relatedArticles}
        footerLinks={footerLinks}
        country={country}
        city={city}
      >
        <MapsListicleArticlePage
          article={effectiveArticle}
          momentHeadings={momentHeadings}
          paywalled={paywalled}
          lockedSlot={
            locked && gate ? (
              phase === 'identifying' || phase === 'anonymous' ? (
                paywallNotice
              ) : phase === 'unverified' ? (
                <GatedLoadError onRetry={retry} reason="access" />
              ) : phase === 'loading' ? (
                <GatedBodySkeleton />
              ) : phase === 'failed' ? (
                <GatedLoadError onRetry={retry} />
              ) : null
            ) : null
          }
        />
      </ListicleArticleLayout>
    </ListicleMapSyncProvider>
  )
}
