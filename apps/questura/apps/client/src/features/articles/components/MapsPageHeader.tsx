import type { JSX } from 'react'
import { ArticlePageHeader } from '@/features/articles/components/ArticlePageHeader'
import type { BookmarkTargetType } from '@/features/bookmarks/types'
import type { MapsListicleArticle } from '@/features/articles/types/mapsListicle'

/** The top of a single-type listicle: the live route and the studio preview share it. */
export function MapsPageHeader({
  article,
  bookmark,
}: {
  article: MapsListicleArticle
  bookmark: { targetType: BookmarkTargetType; targetId: number } | null
}): JSX.Element {
  const featured = article.header?.featuredImage
  return (
    <ArticlePageHeader
      title={article.title}
      description={article.seoSection?.metaDescription}
      featuredImage={featured?.url ? { ...featured, url: featured.url, alt: featured.alt_text } : null}
      publishedAt={article.publishedAt}
      updatedAt={article.updatedAt}
      author={article.author}
      bookmark={bookmark}
    />
  )
}
