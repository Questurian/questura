'use client'

import { useMemo, type JSX } from 'react'
import { MapsListicleArticlePage } from '@/features/articles/MapsListicleArticlePage'
import {
  ListicleMapSyncProvider,
  type ListicleMapPoint,
} from '@/features/articles/components/ListicleMapSync'
import type { ListicleMomentHeadings } from '@/features/articles/components/ListicleMomentHeading'
import { ListicleArticleLayout } from '@/features/articles/layouts/ListicleArticleLayout'
import { mapPointPreviewFromRow } from '@/features/articles/lib/listicleMapPreview'
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
}

export function MapsArticleLayout({
  article,
  momentHeadings,
  relatedArticles,
  footerLinks,
  country,
  city,
}: MapsArticleLayoutProps): JSX.Element {
  const points = useMemo(() => {
    const rows = article.items ?? []
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
    return result
  }, [article])

  return (
    <ListicleMapSyncProvider points={points}>
      <ListicleArticleLayout
        format="maps"
        relatedArticles={relatedArticles}
        footerLinks={footerLinks}
        country={country}
        city={city}
      >
        <MapsListicleArticlePage article={article} momentHeadings={momentHeadings} />
      </ListicleArticleLayout>
    </ListicleMapSyncProvider>
  )
}
