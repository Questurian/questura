'use client'

import { useMemo, type JSX } from 'react'
import { MapsPageHeader } from '@/features/articles/components/MapsPageHeader'
import { MapsArticleLayout } from '@/features/articles/layouts/MapsArticleLayout'
import { renderListicleSectionHeadings } from '@/features/articles/components/ListicleSectionHeading'
import {
  StudioPreviewWaiting,
  studioPreviewPlace,
  useStudioPreviewMessages,
} from '@/features/articles/preview/useStudioPreviewMessages'
import { isMapsListicleArticle } from '@/features/articles/types/mapsListicle'

/** The real single-type listicle page, drawn from whatever the AI Blog Writer posts in. */
export function StudioListiclePreview(): JSX.Element {
  const { article } = useStudioPreviewMessages(isMapsListicleArticle)

  const sectionHeadings = useMemo(() => renderListicleSectionHeadings(article?.items ?? []), [article])

  if (!article) return <StudioPreviewWaiting />

  const { country, city } = studioPreviewPlace(article)

  return (
    <MapsArticleLayout
      article={article}
      header={<MapsPageHeader article={article} bookmark={null} />}
      sectionHeadings={sectionHeadings}
      relatedArticles={[]}
      country={country}
      city={city}
      gate={null}
    />
  )
}
