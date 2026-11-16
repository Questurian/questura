import { ListicleArticleFooter } from '@/features/articles/components/ListicleArticleFooter'
import { MapsPageHeader } from '@/features/articles/components/MapsPageHeader'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/seo/JsonLd'
import { renderListicleSectionHeadings } from '@/features/articles/components/ListicleSectionHeading'
import { PaywallNotice } from '@/features/articles/components/PaywallNotice'
import { buildArticleBreadcrumbJsonLd } from '@/features/articles/lib/articleBreadcrumbJsonLd'
import { buildArticlePageJsonLd } from '@/features/articles/lib/articlePageJsonLd'
import { articleHrefForScope } from '@/features/articles/lib/articleScope'
import { fetchArticle } from '@/features/articles/lib/fetchArticle'
import { fetchListicleFooterLinks } from '@/features/articles/lib/fetchListicleFooterLinks'
import { fetchRelatedMapsArticles } from '@/features/articles/lib/fetchRelatedMapsArticles'
import { readGate } from '@/features/articles/lib/gate'
import { listicleSectionAnchors } from '@/features/articles/lib/listicleSectionGroups'
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
  // swapped in on the client. The server sends every place's section, so the
  // headings for the whole list are rendered here once.
  const sectionSource = gate?.locked
    ? gate.itemSections.map((section) => ({ section }))
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
        header={<MapsPageHeader article={article} bookmark={{ targetType: 'maps', targetId: article.id }} />}
        sectionHeadings={renderListicleSectionHeadings(sectionSource)}
        sectionAnchorIds={listicleSectionAnchors(sectionSource).map((anchor) => anchor.id)}
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
