import assert from 'node:assert/strict'
import test from 'node:test'

import { checkArticleStructuredData } from '../../../lib/seo/structuredDataCheck.mjs'
import { buildArticleJsonLd } from './articleJsonLd.ts'
import { PAYWALL_CLASS } from './gate.ts'

const BASE = 'https://www.questurian.com'
const PATH = '/peru/lima/guides/when-to-visit-lima'
const URL_ = `${BASE}${PATH}`

const variant = (name) => ({ url: `https://questurian-cdn.b-cdn.net/media/lima_${name}.webp` })

function article(overrides = {}) {
  return {
    title: "A Beginner's Guide to When to Visit Lima, Peru",
    publishedAt: '2026-04-05T06:54:44.997Z',
    createdAt: '2026-04-05T06:54:39.676Z',
    updatedAt: '2026-08-21T16:52:37.665Z',
    language: 'en',
    author: { displayName: 'Alan Malpartida', slug: 'alan-malpartida' },
    category: { name: 'Guides' },
    locationRef: { level: 'city', country: 'peru', city: 'lima', countryName: 'Peru', cityName: 'Lima' },
    headerSection: {
      featuredImage: { url: 'https://questurian-cdn.b-cdn.net/media/lima.webp' },
      featuredMediaSet: {
        variants: {
          thumbnail: variant('thumbnail'),
          wide: variant('wide'),
          editorial: variant('editorial'),
          square: variant('square'),
        },
      },
    },
    seoSection: {
      metaDescription: 'Discover the best time to visit Lima.',
      structuredData: { '@type': 'BlogPosting', url: 'https://example.com/stale' },
    },
    ...overrides,
  }
}

const BREADCRUMB = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/` }],
}

function build(overrides = {}, { locked = false } = {}) {
  return buildArticleJsonLd({ article: article(overrides), path: PATH, base: BASE, locked, breadcrumb: BREADCRUMB })
}

function node(graph, type) {
  return graph['@graph'].find((n) => n['@type'] === type)
}

/** The page as a crawler sees it: canonical link, the one block, the notice. */
function html(graph, { locked = false } = {}) {
  const notice = locked ? `<aside data-paywalled class="${PAYWALL_CLASS} rounded-lg">Members only</aside>` : ''
  return `<link rel="canonical" href="${URL_}"/><script type="application/ld+json">${JSON.stringify(graph)}</script><main>${notice}</main>`
}

test('a free article passes every rule of the live check', () => {
  const result = checkArticleStructuredData(html(build()))
  assert.equal(result.ok, true, JSON.stringify(result.results))
})

test('a paid article passes every rule of the live check, flag on the article itself', () => {
  const graph = build({}, { locked: true })
  const result = checkArticleStructuredData(html(graph, { locked: true }))
  assert.equal(result.ok, true, JSON.stringify(result.results))
  const posting = node(graph, 'BlogPosting')
  assert.equal(posting.isAccessibleForFree, false)
  assert.equal(posting.hasPart.cssSelector, `.${PAYWALL_CLASS}`)
  assert.equal(graph['@graph'].filter((n) => n.isAccessibleForFree === false).length, 1)
})

test('one graph: page, article, place and breadcrumb, linked by @id', () => {
  const graph = build()
  assert.equal(graph['@context'], 'https://schema.org')
  assert.deepEqual(graph['@graph'].map((n) => n['@type']), ['WebPage', 'BlogPosting', 'City', 'BreadcrumbList'])

  const page = node(graph, 'WebPage')
  const posting = node(graph, 'BlogPosting')
  const city = node(graph, 'City')
  const crumbs = node(graph, 'BreadcrumbList')

  assert.equal(page['@id'], URL_)
  assert.equal(posting['@id'], `${URL_}#article`)
  assert.deepEqual(posting.mainEntityOfPage, { '@id': URL_ })
  assert.deepEqual(page.breadcrumb, { '@id': crumbs['@id'] })
  assert.deepEqual(posting.about, { '@id': `${BASE}/peru/lima#place` })
  assert.equal(city['@id'], `${BASE}/peru/lima#place`)
  assert.deepEqual(city.containedInPlace, { '@type': 'Country', name: 'Peru' })
  assert.deepEqual(posting.publisher, { '@id': `${BASE}/#organization` })
  assert.equal(crumbs['@context'], undefined, 'no nested @context inside the graph')
})

test('the stored studio label is never used', () => {
  assert.doesNotMatch(JSON.stringify(build()), /example\.com/)
})

test('author: the live byline, linked to its author page', () => {
  assert.deepEqual(node(build(), 'BlogPosting').author, {
    '@type': 'Person',
    name: 'Alan Malpartida',
    url: `${BASE}/authors/alan-malpartida`,
  })
  assert.equal(node(build({ author: null }), 'BlogPosting').author, undefined)
})

test('dates: published falls back to created; modified never before published', () => {
  const posting = node(build(), 'BlogPosting')
  assert.equal(posting.datePublished, '2026-04-05T06:54:44.997Z')
  assert.equal(posting.dateModified, '2026-08-21T16:52:37.665Z')

  const noPublish = node(build({ publishedAt: null }), 'BlogPosting')
  assert.equal(noPublish.datePublished, '2026-04-05T06:54:39.676Z')

  const scheduled = node(build({ publishedAt: '2026-09-01T00:00:00.000Z' }), 'BlogPosting')
  assert.equal(scheduled.dateModified, '2026-09-01T00:00:00.000Z')
})

test('image: 16:9, 4:3 and 1:1 crops, else the featured image, else none', () => {
  assert.deepEqual(node(build(), 'BlogPosting').image, [variant('wide').url, variant('editorial').url, variant('square').url])

  const noSet = build({ headerSection: { featuredImage: { url: 'https://cdn.example.net/x.webp' } } })
  assert.deepEqual(node(noSet, 'BlogPosting').image, ['https://cdn.example.net/x.webp'])

  assert.equal(node(build({ headerSection: null }), 'BlogPosting').image, undefined)
})

test('itineraries read the picture from `header`', () => {
  const itinerary = build({ headerSection: undefined, header: { featuredMediaSet: { variants: { wide: variant('wide') } } } })
  assert.deepEqual(node(itinerary, 'BlogPosting').image, [variant('wide').url])
})

test('place: country-level and neighborhood articles', () => {
  const country = build({ locationRef: { level: 'country', country: 'peru', countryName: 'Peru' } })
  assert.equal(node(country, 'Country')['@id'], `${BASE}/peru#place`)

  const hood = build({
    locationRef: {
      level: 'neighborhood', country: 'peru', city: 'lima', neighborhood: 'barranco',
      countryName: 'Peru', cityName: 'Lima', neighborhoodName: 'Barranco',
    },
  })
  const place = node(hood, 'Place')
  assert.equal(place.name, 'Barranco')
  assert.equal(place.containedInPlace.name, 'Lima')
  assert.deepEqual(node(hood, 'BlogPosting').about, { '@id': place['@id'] })

  assert.equal(node(build({ locationRef: null }), 'BlogPosting').about, undefined)
})
