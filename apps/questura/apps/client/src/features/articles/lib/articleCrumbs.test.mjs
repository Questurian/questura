import assert from 'node:assert/strict'
import test from 'node:test'

import { articleCrumbsFromPath } from './articleCrumbs.ts'
import { buildArticleBreadcrumbJsonLd } from './articleBreadcrumbJsonLd.ts'
import { articleIndexDescription, articleIndexTitle, scopeHeading } from './articleIndexHeading.ts'

// What opens under the Peru launch: the Lima page and everything under it.
// `/peru`, `/peru/articles`, `/articles` and other cities are not pages.
const launch = (pathname) => pathname === '/peru/lima' || pathname.startsWith('/peru/lima/')

test('a Lima map: Peru is a label, Lima and Maps link to real pages', () => {
  assert.deepEqual(articleCrumbsFromPath('/peru/lima/maps/best-lomo-saltado-in-lima', launch), [
    { label: 'Peru', href: null },
    { label: 'Lima', href: '/peru/lima' },
    { label: 'Maps', href: '/peru/lima/maps' },
  ])
})

test('an itinerary links to the itineraries list', () => {
  assert.deepEqual(articleCrumbsFromPath('/peru/lima/itineraries/1-day-lima-peru-itinerary', launch).at(-1), {
    label: 'Itineraries',
    href: '/peru/lima/itineraries',
  })
})

test('a category has no page of its own, so it links to the place\'s Articles list', () => {
  assert.deepEqual(articleCrumbsFromPath('/peru/lima/intel/drink-spiking-lima-protect-yourself', launch).at(-1), {
    label: 'Intel',
    href: '/peru/lima/articles',
  })
})

test('nothing links where no page opens', () => {
  assert.deepEqual(articleCrumbsFromPath('/colombia/medellin/maps/best-rooftop-bars-medellin', launch), [
    { label: 'Colombia', href: null },
    { label: 'Medellin', href: null },
    { label: 'Maps', href: null },
  ])
  assert.deepEqual(articleCrumbsFromPath('/articles/where-to-go-south-america-2027', launch), [
    { label: 'Articles', href: null },
  ])
  assert.deepEqual(articleCrumbsFromPath('/peru/safety/a-country-guide', launch), [
    { label: 'Peru', href: null },
    { label: 'Safety', href: null },
  ])
  assert.deepEqual(articleCrumbsFromPath(undefined, launch), [])
  assert.deepEqual(articleCrumbsFromPath('/just-a-slug', launch), [])
})

test('Google\'s breadcrumb lists only pages that open: no /peru, no /peru/lima/intel', () => {
  const data = buildArticleBreadcrumbJsonLd({
    path: '/peru/lima/intel/drink-spiking-lima-protect-yourself',
    articleTitle: 'Drink Spiking in Lima',
    isOpen: launch,
  })
  const items = data.itemListElement.map((item) => [item.position, item.name, new URL(item.item).pathname])
  assert.deepEqual(items, [
    [1, 'Home', '/'],
    [2, 'Lima', '/peru/lima'],
    [3, 'Intel', '/peru/lima/articles'],
    [4, 'Drink Spiking in Lima', '/peru/lima/intel/drink-spiking-lima-protect-yourself'],
  ])
})

test('list pages get a real name for Google', () => {
  const lima = { kind: 'city', country: 'peru', city: 'lima' }
  assert.equal(scopeHeading(lima, 'maps'), 'Lima Maps')
  assert.equal(articleIndexTitle(lima, 'maps', 1), 'Lima Maps: Where to Eat, Drink and Go Out — Questurian')
  assert.equal(articleIndexTitle(lima, 'articles', 2), 'Lima Travel Articles and Guides (Page 2) — Questurian')
  assert.equal(articleIndexTitle({ kind: 'global' }, 'itineraries', 1), 'Itineraries: Day-by-Day Plans — Questurian')
  assert.match(articleIndexDescription(lima, 'itineraries'), /^Day-by-day Lima itineraries/)
  for (const type of ['maps', 'articles', 'itineraries']) {
    assert.ok(articleIndexDescription(lima, type).length <= 160, type)
  }
})
