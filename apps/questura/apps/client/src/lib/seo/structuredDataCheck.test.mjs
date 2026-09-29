import assert from 'node:assert/strict'
import test from 'node:test'

import {
  checkArticleStructuredData,
  extractCanonical,
  extractJsonLdBlocks,
  sameAddress,
} from './structuredDataCheck.mjs'

const PAGE = 'https://www.questurian.com/peru/lima/guides/when-to-visit-lima'

function goodArticle(overrides = {}) {
  return {
    '@type': 'BlogPosting',
    '@id': `${PAGE}#article`,
    mainEntityOfPage: { '@id': PAGE },
    headline: 'When to Visit Lima',
    image: ['https://cdn.example.net/lima_16x9.webp'],
    datePublished: '2026-04-05T06:54:44.997Z',
    dateModified: '2026-04-06T06:54:45.009Z',
    author: {
      '@type': 'Person',
      name: 'Alan Malpartida',
      url: 'https://www.questurian.com/authors/alan-malpartida',
    },
    ...overrides,
  }
}

function page({ nodes = [goodArticle()], canonical = PAGE, body = '', raw } = {}) {
  const graph = { '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage', '@id': PAGE }, ...nodes] }
  const blocks = raw ?? [JSON.stringify(graph)]
  return [
    '<html><head>',
    canonical ? `<link rel="canonical" href="${canonical}"/>` : '',
    ...blocks.map((b) => `<script type="application/ld+json">${b}</script>`),
    `</head><body>${body}</body></html>`,
  ].join('')
}

function failing(html) {
  const { results } = checkArticleStructuredData(html)
  return Object.fromEntries(Object.entries(results).filter(([, r]) => !r.ok).map(([k, r]) => [k, r.detail]))
}

test('a complete free article passes every rule', () => {
  const result = checkArticleStructuredData(page())
  assert.deepEqual(failing(page()), {})
  assert.equal(result.ok, true)
  assert.equal(result.canonical, PAGE)
})

test('reads the canonical link and every JSON-LD block', () => {
  const html = `<link href="${PAGE}" rel="canonical"><script type='application/ld+json'>{}</script><script type="application/ld+json">[]</script>`
  assert.equal(extractCanonical(html), PAGE)
  assert.equal(extractJsonLdBlocks(html).length, 2)
})

test('json: a block that does not parse fails', () => {
  assert.match(failing(page({ raw: ['{"@type": "BlogPosting",'] })).json, /block 1/)
})

test('article: none or two article entries fail', () => {
  assert.equal(failing(page({ nodes: [] })).article, 'no article entry')
  const twice = page({
    raw: [
      JSON.stringify({ '@graph': [goodArticle()] }),
      JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'x' }),
    ],
  })
  assert.equal(failing(twice).article, '2 article entries')
})

test('address: must be the canonical address, never example.com or missing', () => {
  const noAddress = goodArticle({ mainEntityOfPage: undefined })
  delete noAddress.mainEntityOfPage
  assert.equal(failing(page({ nodes: [noAddress] })).address, 'no url or mainEntityOfPage')

  const example = goodArticle({ url: 'https://example.com/when-to-visit-lima' })
  assert.match(failing(page({ nodes: [example] })).address, /^url is https:\/\/example\.com/)

  const wrongPath = goodArticle({ mainEntityOfPage: 'https://www.questurian.com/peru/lima/when-to-visit-lima' })
  assert.match(failing(page({ nodes: [wrongPath] })).address, /^mainEntityOfPage/)

  const wrongId = goodArticle({ '@id': 'https://example.com/x#article' })
  assert.match(failing(page({ nodes: [wrongId] })).address, /^@id/)

  assert.match(failing(page({ canonical: '' })).address, /no canonical/)
})

test('address: a trailing slash or fragment is the same page', () => {
  assert.equal(sameAddress(`${PAGE}/`, PAGE), true)
  assert.equal(sameAddress(`${PAGE}#article`, PAGE), true)
  assert.equal(sameAddress('https://example.com/a', PAGE), false)
  assert.equal(sameAddress('not a url', PAGE), false)
})

test('author: missing, a service account, not a person, or no author page fails', () => {
  const none = goodArticle()
  delete none.author
  assert.equal(failing(page({ nodes: [none] })).author, 'no author')

  const service = goodArticle({ author: { '@type': 'Person', name: 'Service Account' } })
  assert.equal(failing(page({ nodes: [service] })).author, 'author is "Service Account"')

  const org = goodArticle({ author: { '@type': 'Organization', name: 'Questurian', url: 'https://www.questurian.com/authors/q' } })
  assert.match(failing(page({ nodes: [org] })).author, /not a Person/)

  const noLink = goodArticle({ author: { '@type': 'Person', name: 'Alan Malpartida' } })
  assert.match(failing(page({ nodes: [noLink] })).author, /no \/authors\/ link/)

  const otherSite = goodArticle({ author: { '@type': 'Person', name: 'Alan', url: 'https://example.com/authors/alan' } })
  assert.match(failing(page({ nodes: [otherSite] })).author, /no \/authors\/ link/)
})

test('author: a reference to a Person elsewhere in the graph resolves', () => {
  const person = { '@type': 'Person', '@id': 'https://www.questurian.com/authors/alan#person', name: 'Alan', url: 'https://www.questurian.com/authors/alan' }
  const html = page({ nodes: [goodArticle({ author: { '@id': person['@id'] } }), person] })
  assert.equal(failing(html).author, undefined)
})

test('dates: both needed, ISO 8601 with a zone, modified not before published', () => {
  const none = goodArticle()
  delete none.datePublished
  assert.equal(failing(page({ nodes: [none] })).dates, 'no datePublished')

  const dayOnly = goodArticle({ dateModified: '2026-04-06' })
  assert.match(failing(page({ nodes: [dayOnly] })).dates, /not ISO 8601/)

  const backwards = goodArticle({ dateModified: '2026-01-01T00:00:00Z' })
  assert.equal(failing(page({ nodes: [backwards] })).dates, 'dateModified is before datePublished')
})

test('image: needs an absolute https picture, in any of its shapes', () => {
  const none = goodArticle()
  delete none.image
  assert.equal(failing(page({ nodes: [none] })).image, 'no image')

  const relative = goodArticle({ image: '/media/lima.webp' })
  assert.match(failing(page({ nodes: [relative] })).image, /not an absolute https/)

  const imageObject = goodArticle({ image: { '@type': 'ImageObject', url: 'https://cdn.example.net/x.webp' } })
  assert.equal(failing(page({ nodes: [imageObject] })).image, undefined)
})

const PAID = {
  isAccessibleForFree: false,
  hasPart: { '@type': 'WebPageElement', isAccessibleForFree: false, cssSelector: '.paywalled' },
}
const NOTICE = '<aside class="notice paywalled" data-paywalled>Members only</aside>'

test('paywall: a paid page with the flag and a class selector on the article passes', () => {
  assert.deepEqual(failing(page({ nodes: [goodArticle(PAID)], body: NOTICE })), {})
})

test('paywall: a paid page without the flag on the article fails', () => {
  assert.match(failing(page({ body: NOTICE })).paywall, /no isAccessibleForFree: false/)
})

test('paywall: an attribute selector is not enough, Google wants a class', () => {
  const attribute = goodArticle({ ...PAID, hasPart: { ...PAID.hasPart, cssSelector: '[data-paywalled]' } })
  assert.match(failing(page({ nodes: [attribute], body: NOTICE })).paywall, /not a class selector/)
})

test('paywall: the class must be on an element of the page', () => {
  assert.match(
    failing(page({ nodes: [goodArticle(PAID)], body: '<aside data-paywalled class="paywalled-note">x</aside>' })).paywall,
    /no element on the page has class "paywalled"/,
  )
})

test('paywall: a free page must not be marked paid', () => {
  assert.equal(failing(page({ nodes: [goodArticle({ isAccessibleForFree: false })] })).paywall, 'marked paid on a free page')
})

test('the rules after `article` report why they could not run', () => {
  const found = failing(page({ nodes: [] }))
  assert.equal(found.author, 'needs exactly one article entry')
})
