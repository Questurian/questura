import { ArticleAuthorBanner } from '@/features/articles/components/ArticleAuthorBanner'
import { ListicleArticleFooter } from '@/features/articles/components/ListicleArticleFooter'
import { ItineraryPageHeader } from '@/features/articles/components/ItineraryPageHeader'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/seo/JsonLd'
import { PaywallNotice } from '@/features/articles/components/PaywallNotice'
import { buildArticlePageJsonLd } from '@/features/articles/lib/articlePageJsonLd'
import { readGate } from '@/features/articles/lib/gate'
import { articleHrefForScope } from '@/features/articles/lib/articleScope'
import { fetchArticle } from '@/features/articles/lib/fetchArticle'
import { fetchListicleFooterLinks } from '@/features/articles/lib/fetchListicleFooterLinks'
import { fetchRelatedMapsArticles } from '@/features/articles/lib/fetchRelatedMapsArticles'
import { ItineraryArticleLayout } from '@/features/articles/layouts/ItineraryArticleLayout'
import { isListicleItineraryArticle } from '@/features/articles/types/itineraryListicle'
import type { ArticleScope } from '@/features/articles/lib/articleScope'

type RenderItineraryArticleRouteParams = {
  scope: Extract<ArticleScope, { kind: 'city' }>
  slug: string
  lang?: string
}

export async function renderItineraryArticleRoute({
  scope,
  slug,
  lang,
}: RenderItineraryArticleRouteParams) {
  const [article, relatedArticles, footerLinks] = await Promise.all([
    fetchArticle({ scope, type: 'itineraries', slug, lang }),
    fetchRelatedMapsArticles(scope.country, scope.city, slug),
    fetchListicleFooterLinks({
      country: scope.country,
      city: scope.city,
      currentHref: articleHrefForScope(scope, 'itineraries', slug),
      currentSlug: slug,
      lang,
    }),
  ])

  if (!article || !isListicleItineraryArticle(article)) {
    notFound()
  }

  const path = articleHrefForScope(scope, 'itineraries', slug)
  const gate = readGate(article)
  const locked = gate?.locked === true

  return (
    <>
      <JsonLd data={buildArticlePageJsonLd({ article, path, locked })} />
      <ItineraryArticleLayout
        article={article}
        authorBanner={article.author ? <ArticleAuthorBanner author={article.author} /> : null}
        header={<ItineraryPageHeader article={article} bookmark={{ targetType: "itineraries", targetId: article.id }} />}
        relatedArticles={relatedArticles}
        footer={footerLinks ? <ListicleArticleFooter links={footerLinks} country={scope.country} city={scope.city} /> : null}
        country={scope.country}
        city={scope.city}
        gate={gate}
        paywallNotice={locked && gate ? <PaywallNotice gate={gate} returnTo={path} fade={false} /> : null}
      />
    </>
  )
}
