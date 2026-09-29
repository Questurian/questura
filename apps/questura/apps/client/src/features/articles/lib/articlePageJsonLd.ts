import { getPublicBaseUrl } from '@/lib/seo/publicBaseUrl'
import { buildArticleBreadcrumbJsonLd } from './articleBreadcrumbJsonLd'
import { buildArticleJsonLd, type ArticleJsonLdSource } from './articleJsonLd'

const PUBLIC_BASE_URL = getPublicBaseUrl()

/**
 * The one JSON-LD block a standard article or itinerary page emits: the page,
 * the article, its place and its breadcrumb in one graph. See articleJsonLd.ts.
 */
export function buildArticlePageJsonLd({
  article,
  path,
  locked,
}: {
  article: ArticleJsonLdSource
  path: string
  locked: boolean
}): Record<string, unknown> {
  return buildArticleJsonLd({
    article,
    path,
    base: PUBLIC_BASE_URL,
    locked,
    breadcrumb: buildArticleBreadcrumbJsonLd({ path, articleTitle: article.title }),
  })
}
