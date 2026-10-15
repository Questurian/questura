import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/seo/JsonLd'
import { renderListicleMomentHeadings } from '@/features/articles/components/ListicleMomentHeading'
import { buildArticleBreadcrumbJsonLd } from '@/features/articles/lib/articleBreadcrumbJsonLd'
import { buildArticlePageJsonLd } from '@/features/articles/lib/articlePageJsonLd'
import { articleHrefForScope } from '@/features/articles/lib/articleScope'
import { fetchArticle } from '@/features/articles/lib/fetchArticle'
import { fetchListicleFooterLinks } from '@/features/articles/lib/fetchListicleFooterLinks'
import { fetchRelatedMapsArticles } from '@/features/articles/lib/fetchRelatedMapsArticles'
import { readGate } from '@/features/articles/lib/gate'
import { MapsArticleLayout } from '@/features/articles/layouts/MapsArticleLayout'
import { isMapsListicleArticle } from '@/features/articles/types/mapsListicle'
import type { ArticleScope } from '@/features/articles/lib/articleScope'

type RenderMapsArticleRouteParams = {
  scope: Extract<ArticleScope, { kind: 'city' }>
  slug: string
  lang?: string
}

export async function renderMapsArticleRoute({
  scope,
  slug,
  lang,
}: RenderMapsArticleRouteParams) {
  const [article, relatedArticles, footerLinks] = await Promise.all([
    fetchArticle({ scope, type: 'maps', slug, lang }),
    fetchRelatedMapsArticles(scope.country, scope.city, slug),
    fetchListicleFooterLinks({
      country: scope.country,
      city: scope.city,
      currentHref: articleHrefForScope(scope, 'maps', slug),
      currentSlug: slug,
      lang,
    }),
  ])

  if (!article || !isMapsListicleArticle(article)) {
    notFound()
  }

  const path = articleHrefForScope(scope, 'maps', slug)
  const gate = readGate(article)
  const locked = gate?.locked === true
  // A locked list arrives cut to its sample, but a member's full list is
  // swapped in on the client, where the heading icons are not allowed (see
  // renderListicleMomentHeadings). The server sends every place's moment, so
  // the headings for the whole list are rendered here once.
  const momentSource = gate?.locked
    ? gate.itemMoments.map((moment) => ({ moment }))
    : (article.items ?? [])

  return (
    <>
      {locked ? (
        // The stored label is an ItemList of every place, and the server drops
        // it from a locked list. The site builds the paywall markup instead
        // (ADR 0017), the same as for articles and itineraries.
        <JsonLd data={buildArticlePageJsonLd({ article, path, locked: true })} />
      ) : (
        <>
          <JsonLd data={article.seoSection?.structuredData} />
          <JsonLd data={buildArticleBreadcrumbJsonLd({ path, articleTitle: article.title })} />
        </>
      )}
      <MapsArticleLayout
        article={article}
        momentHeadings={renderListicleMomentHeadings(momentSource)}
        relatedArticles={relatedArticles}
        footerLinks={footerLinks}
        country={scope.country}
        city={scope.city}
        path={path}
      />
    </>
  )
}
