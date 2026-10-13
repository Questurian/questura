import type { SectionPageCopy } from './sectionPages.ts'

/**
 * What a section page's structured data needs from its published blocks: the
 * article teasers, in page order. Every article-backed block carries `items`;
 * the others (hotels, tours, newsletter) don't, and are skipped.
 */
type TeaserLike = {
  title?: string | null
  articlePath?: string | null
  image?: { url?: string | null; width?: number | null; height?: number | null } | null
}
type BlockLike = object

function teasers(blocks: readonly BlockLike[]): TeaserLike[] {
  return blocks.flatMap((block) => {
    const items = (block as { items?: unknown }).items
    return Array.isArray(items) ? (items.filter(Boolean) as TeaserLike[]) : []
  })
}

/** The articles a section page links to, once each, in page order. */
export function sectionPageArticles(
  blocks: readonly BlockLike[],
): { title: string; path: string }[] {
  const seen = new Set<string>()
  const articles: { title: string; path: string }[] = []
  for (const item of teasers(blocks)) {
    const path = item.articlePath?.trim()
    const title = item.title?.trim()
    if (!path || !path.startsWith('/') || !title || seen.has(path)) continue
    seen.add(path)
    articles.push({ title, path })
  }
  return articles
}

/** The first teaser photo on the page: the share image for the section. */
export function sectionPageShareImage(
  blocks: readonly BlockLike[],
): { url: string; width?: number; height?: number } | null {
  for (const item of teasers(blocks)) {
    const url = item.image?.url
    if (url) {
      return {
        url,
        ...(item.image?.width ? { width: item.image.width } : {}),
        ...(item.image?.height ? { height: item.image.height } : {}),
      }
    }
  }
  return null
}

/**
 * One @graph: the section as a `CollectionPage` whose main entity is the
 * `ItemList` of articles it shows, and the Home › Section breadcrumb. The
 * publisher points at the `Organization` node every public page prints
 * (`lib/seo/organizationJsonLd.ts`).
 */
export function buildSectionPageJsonLd(
  copy: SectionPageCopy,
  blocks: readonly BlockLike[],
  baseUrl: string,
): Record<string, unknown> {
  const base = baseUrl.replace(/\/+$/, '')
  const url = `${base}${copy.path}`
  const articles = sectionPageArticles(blocks)

  const page: Record<string, unknown> = {
    '@type': 'CollectionPage',
    '@id': `${url}#webpage`,
    url,
    name: copy.metaTitle,
    description: copy.description,
    inLanguage: 'en',
    publisher: { '@id': `${base}/#organization` },
    breadcrumb: { '@id': `${url}#breadcrumb` },
  }

  if (articles.length > 0) {
    page.mainEntity = {
      '@type': 'ItemList',
      '@id': `${url}#articles`,
      numberOfItems: articles.length,
      itemListElement: articles.map((article, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${base}${article.path}`,
        name: article.title,
      })),
    }
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      page,
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
          { '@type': 'ListItem', position: 2, name: copy.name, item: url },
        ],
      },
    ],
  }
}
