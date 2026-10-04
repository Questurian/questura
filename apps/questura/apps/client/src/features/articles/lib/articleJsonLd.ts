/**
 * The article page's structured data (JSON-LD), built at render from the live
 * article: one `@graph` holding the page, the article, its place and its
 * breadcrumb, linked by `@id`.
 *
 * The studio used to write this once, at publish, and the site printed it as
 * stored. It could not know the real address (the category is set later in
 * Payload), and it never followed later edits, so every live article carried a
 * wrong address and a stale author. Everything here comes from the article as
 * Payload holds it now, so it stays right after any edit. The stored
 * `seoSection.structuredData` is ignored for these pages.
 *
 * Checked on the live site by `scripts/check-structured-data.mjs`; the rules
 * are in `src/lib/seo/structuredDataCheck.mjs`.
 *
 * Pure (the base URL is passed in), so node:test covers it.
 */

import { PAYWALL_CLASS } from './gate.ts'

type MediaVariant = { url?: string | null } | null | undefined

type MediaSetLike = {
  variants?: Record<string, MediaVariant> | null
} | null

type HeaderLike = {
  featuredImage?: { url?: string | null } | null
  featuredMediaSet?: MediaSetLike
} | null

export type ArticleJsonLdSource = {
  title: string
  publishedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  language?: string | null
  author?: { displayName?: string | null; slug?: string | null } | null
  category?: { name?: string | null } | null
  locationRef?: {
    level?: string | null
    country?: string | null
    city?: string | null
    neighborhood?: string | null
    countryName?: string | null
    cityName?: string | null
    neighborhoodName?: string | null
  } | null
  /** Standard articles. */
  headerSection?: HeaderLike
  /** Itineraries. */
  header?: HeaderLike
  seoSection?: { metaDescription?: string | null } | null
}

type BuildArticleJsonLdParams = {
  article: ArticleJsonLdSource
  /** Canonical path, e.g. /peru/lima/guides/when-to-visit-lima */
  path: string
  /** Public origin, e.g. https://www.questurian.com */
  base: string
  locked: boolean
  /** The existing BreadcrumbList node; it joins the graph. */
  breadcrumb: Record<string, unknown>
}

/**
 * Picture shapes Google asks for, widest first: 16:9, 4:3 and 1:1. The
 * variants are fixed crops made at upload (wide 1920x1080, editorial
 * 1600x1200, square 1080x1080).
 */
const IMAGE_VARIANTS = ['wide', 'editorial', 'square'] as const

function isAbsoluteHttps(url: unknown): url is string {
  return typeof url === 'string' && /^https:\/\/[^/]+\//.test(url)
}

function imagesOf(article: ArticleJsonLdSource): string[] {
  const header = article.headerSection ?? article.header ?? null
  const variants = header?.featuredMediaSet?.variants ?? null
  const urls: string[] = []
  if (variants) {
    for (const name of IMAGE_VARIANTS) {
      const url = variants[name]?.url
      if (isAbsoluteHttps(url) && !urls.includes(url)) urls.push(url)
    }
  }
  const fallback = header?.featuredImage?.url
  if (urls.length === 0 && isAbsoluteHttps(fallback)) urls.push(fallback)
  return urls
}

function isoOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time).toISOString() : null
}

function datesOf(article: ArticleJsonLdSource): { datePublished?: string; dateModified?: string } {
  const published = isoOrNull(article.publishedAt) ?? isoOrNull(article.createdAt)
  const updated = isoOrNull(article.updatedAt)
  if (!published) return updated ? { dateModified: updated } : {}
  // A publish date set after the last save (scheduled or back-filled) would
  // make the article look modified before it was published.
  const modified = updated && updated > published ? updated : published
  return { datePublished: published, dateModified: modified }
}

function authorOf(article: ArticleJsonLdSource, base: string): Record<string, unknown> | null {
  const name = article.author?.displayName?.trim()
  if (!name) return null
  const slug = article.author?.slug?.trim()
  return {
    '@type': 'Person',
    name,
    ...(slug ? { url: `${base}/authors/${encodeURIComponent(slug)}` } : {}),
  }
}

/** The place the article is about, as its own node, or null. */
function placeOf(article: ArticleJsonLdSource, base: string): Record<string, unknown> | null {
  const ref = article.locationRef
  if (!ref?.country || !ref.countryName) return null

  const country = { '@type': 'Country', name: ref.countryName }
  const countryPath = `/${ref.country}`

  if (ref.city && ref.cityName) {
    const cityPath = `${countryPath}/${ref.city}`
    const city = {
      '@type': 'City',
      '@id': `${base}${cityPath}#place`,
      name: ref.cityName,
      url: `${base}${cityPath}`,
      containedInPlace: country,
    }
    if (ref.level === 'neighborhood' && ref.neighborhood && ref.neighborhoodName) {
      return {
        '@type': 'Place',
        '@id': `${base}${cityPath}/${ref.neighborhood}#place`,
        name: ref.neighborhoodName,
        containedInPlace: city,
      }
    }
    return city
  }

  return { ...country, '@id': `${base}${countryPath}#place`, url: `${base}${countryPath}` }
}

/**
 * The paywall properties Google reads to tell a lead-in sample apart from
 * cloaking. `hasPart` names the element standing in for the withheld body:
 * under ADR-0009 the locked content is absent from the response, so the
 * marked element is the notice that replaces it. Google wants a class
 * selector here, not an attribute selector.
 */
function paywallProperties(): Record<string, unknown> {
  return {
    isAccessibleForFree: false,
    hasPart: {
      '@type': 'WebPageElement',
      isAccessibleForFree: false,
      cssSelector: `.${PAYWALL_CLASS}`,
    },
  }
}

export function buildArticleJsonLd({
  article,
  path,
  base,
  locked,
  breadcrumb,
}: BuildArticleJsonLdParams): Record<string, unknown> {
  const origin = base.replace(/\/+$/, '')
  const url = `${origin}${path}`
  const pageId = url
  const articleId = `${url}#article`
  const breadcrumbId = `${url}#breadcrumb`

  const images = imagesOf(article)
  const author = authorOf(article, origin)
  const place = placeOf(article, origin)
  const description = article.seoSection?.metaDescription?.trim()
  const section = article.category?.name?.trim()
  const language = article.language?.trim()

  const breadcrumbNode: Record<string, unknown> = { ...breadcrumb }
  delete breadcrumbNode['@context']

  const webPage = {
    '@type': 'WebPage',
    '@id': pageId,
    url,
    name: article.title,
    ...(language ? { inLanguage: language } : {}),
    breadcrumb: { '@id': breadcrumbId },
  }

  const articleNode = {
    '@type': 'BlogPosting',
    '@id': articleId,
    mainEntityOfPage: { '@id': pageId },
    url,
    headline: article.title,
    ...(description ? { description } : {}),
    ...(section ? { articleSection: section } : {}),
    ...(images.length > 0 ? { image: images } : {}),
    ...datesOf(article),
    ...(author ? { author } : {}),
    publisher: { '@id': `${origin}/#organization` },
    ...(place ? { about: { '@id': place['@id'] } } : {}),
    ...(language ? { inLanguage: language } : {}),
    ...(locked ? paywallProperties() : {}),
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      webPage,
      articleNode,
      ...(place ? [place] : []),
      { ...breadcrumbNode, '@id': breadcrumbId },
    ],
  }
}
