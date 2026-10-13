import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildSectionPageJsonLd,
  sectionPageArticles,
  sectionPageShareImage,
} from './sectionPageJsonLd.ts'
import { SECTION_PAGES } from './sectionPages.ts'

const BASE = 'https://www.questurian.com'

const blocks = [
  {
    blockType: 'featured-articles',
    items: [
      {
        title: 'The Best Chifa Restaurants in Lima',
        articlePath: '/peru/lima/maps/best-chifa-lima',
        image: { url: 'https://cdn.example/chifa.webp', width: 1200, height: 800 },
      },
      { title: 'No path yet', articlePath: null },
    ],
  },
  { blockType: 'newsletter-signup' },
  {
    blockType: 'questurian-maps-dark',
    items: [
      { title: 'The Best Coffee Shops in Medellín', articlePath: '/colombia/medellin/maps/coffee' },
      // The same map featured twice on one page is listed once.
      { title: 'The Best Chifa Restaurants in Lima', articlePath: '/peru/lima/maps/best-chifa-lima' },
    ],
  },
]

test('the article list is every linked teaser once, in page order', () => {
  assert.deepEqual(sectionPageArticles(blocks), [
    { title: 'The Best Chifa Restaurants in Lima', path: '/peru/lima/maps/best-chifa-lima' },
    { title: 'The Best Coffee Shops in Medellín', path: '/colombia/medellin/maps/coffee' },
  ])
})

test('the share image is the first teaser photo', () => {
  assert.deepEqual(sectionPageShareImage(blocks), {
    url: 'https://cdn.example/chifa.webp',
    width: 1200,
    height: 800,
  })
  assert.equal(sectionPageShareImage([]), null)
})

test('the graph is a CollectionPage of the articles plus a breadcrumb', () => {
  const data = buildSectionPageJsonLd(SECTION_PAGES.eat, blocks, `${BASE}/`)
  const [page, breadcrumb] = data['@graph']

  assert.equal(page['@type'], 'CollectionPage')
  assert.equal(page.url, `${BASE}/eat`)
  assert.deepEqual(page.publisher, { '@id': `${BASE}/#organization` })
  assert.equal(page.mainEntity['@type'], 'ItemList')
  assert.equal(page.mainEntity.numberOfItems, 2)
  assert.deepEqual(page.mainEntity.itemListElement[1], {
    '@type': 'ListItem',
    position: 2,
    url: `${BASE}/colombia/medellin/maps/coffee`,
    name: 'The Best Coffee Shops in Medellín',
  })

  assert.equal(breadcrumb['@type'], 'BreadcrumbList')
  assert.deepEqual(
    breadcrumb.itemListElement.map((crumb) => [crumb.name, crumb.item]),
    [
      ['Home', `${BASE}/`],
      ['Eat', `${BASE}/eat`],
    ],
  )
})

test('an unpublished section has no item list', () => {
  const data = buildSectionPageJsonLd(SECTION_PAGES.stay, [], BASE)
  assert.equal(data['@graph'][0].mainEntity, undefined)
})
