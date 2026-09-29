import assert from 'node:assert/strict'
import test from 'node:test'

import { showsMasthead } from './navbarMasthead.ts'

test('home, country and city pages open with the big masthead', () => {
  for (const path of ['/', '', '/peru', '/peru/', '/peru/lima', '/costa-rica/san-jose']) {
    assert.equal(showsMasthead(path), true, path)
  }
})

test('every other page opens with the thin bar', () => {
  for (const path of [
    '/account',
    '/account/bookmarks',
    '/account/change-email',
    '/search',
    '/join',
    '/articles',
    '/articles/some-article',
    '/articles/page/2',
    '/peru/articles',
    '/peru/lima/articles',
    '/peru/lima/maps',
    '/peru/lima/maps/best-ceviche',
    '/peru/lima/itineraries',
    '/peru/lima/itineraries/three-days',
    '/peru/lima/food/best-ceviche',
    '/peru/lima/food',
    '/authors/alan',
    '/eat',
    '/stay',
    '/faq',
    '/itineraries',
    '/newsletters',
    '/privacy',
    '/terms',
    '/auth',
    '/auth/reset-password',
    '/auth-error',
    '/auth-callback-close',
    '/purchase/monthly',
    '/subscription/success',
  ]) {
    assert.equal(showsMasthead(path), false, path)
  }
})
