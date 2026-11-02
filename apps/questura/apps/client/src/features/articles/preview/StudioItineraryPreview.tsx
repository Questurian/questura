'use client'

import type { JSX } from 'react'
import { ArticleAuthorBanner } from '@/features/articles/components/ArticleAuthorBanner'
import { ItineraryPageHeader } from '@/features/articles/components/ItineraryPageHeader'
import { ItineraryArticleLayout } from '@/features/articles/layouts/ItineraryArticleLayout'
import {
  StudioPreviewWaiting,
  studioPreviewPlace,
  useStudioPreviewMessages,
} from '@/features/articles/preview/useStudioPreviewMessages'
import { isListicleItineraryArticle } from '@/features/articles/types/itineraryListicle'

/** The real itinerary page, drawn from whatever the AI Blog Writer posts in. */
export function StudioItineraryPreview(): JSX.Element {
  const { article, dayIndex } = useStudioPreviewMessages(isListicleItineraryArticle)

  if (!article) return <StudioPreviewWaiting />

  const { country, city } = studioPreviewPlace(article)

  return (
    <ItineraryArticleLayout
      article={article}
      authorBanner={article.author ? <ArticleAuthorBanner author={article.author} /> : null}
      header={<ItineraryPageHeader article={article} bookmark={null} />}
      relatedArticles={[]}
      country={country}
      city={city}
      gate={null}
      followDayIndex={dayIndex}
    />
  )
}
