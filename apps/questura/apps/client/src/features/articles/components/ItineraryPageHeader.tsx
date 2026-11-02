import type { JSX } from 'react'
import { ArticlePageHeader } from '@/features/articles/components/ArticlePageHeader'
import type { BookmarkTargetType } from '@/features/bookmarks/types'
import type { ListicleItineraryArticle } from '@/features/articles/types/itineraryListicle'

/** The top of an itinerary page: the live route and the studio preview share it. */
export function ItineraryPageHeader({
  article,
  bookmark,
}: {
  article: ListicleItineraryArticle
  bookmark: { targetType: BookmarkTargetType; targetId: number } | null
}): JSX.Element {
  const featured = article.header?.featuredImage
  return (
    <ArticlePageHeader
      title={article.title}
      description={article.seoSection?.metaDescription}
      featuredImage={featured?.url ? { ...featured, url: featured.url, alt: featured.alt_text } : null}
      publishedAt={article.publishedAt ?? undefined}
      updatedAt={article.updatedAt}
      author={article.author}
      bookmark={bookmark}
      bylineVariant="plain"
    />
  )
}
