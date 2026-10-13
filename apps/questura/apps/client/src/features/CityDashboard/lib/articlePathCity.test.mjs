import assert from 'node:assert/strict'
import test from 'node:test'

import { cityLabelFromArticlePath } from './articlePathCity.ts'

test('a map path names its city', () => {
  assert.equal(cityLabelFromArticlePath('/peru/lima/maps/best-chifa-lima'), 'Lima')
  assert.equal(
    cityLabelFromArticlePath('/mexico/mexico-city/maps/best-tacos-al-pastor'),
    'Mexico City',
  )
})

test('an itinerary path names its city', () => {
  assert.equal(cityLabelFromArticlePath('/colombia/medellin/itineraries/three-days'), 'Medellin')
})

test('anything else has no city', () => {
  assert.equal(cityLabelFromArticlePath(null), null)
  assert.equal(cityLabelFromArticlePath(''), null)
  // Standard articles route by category, and may be worldwide.
  assert.equal(cityLabelFromArticlePath('/peru/lima/guides/when-to-visit-lima'), null)
  assert.equal(cityLabelFromArticlePath('/articles/some-worldwide-piece'), null)
  assert.equal(cityLabelFromArticlePath('/peru/lima'), null)
})
