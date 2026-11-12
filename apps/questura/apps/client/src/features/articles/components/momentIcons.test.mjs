import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const typeSource = read('../types/itineraryListicle.ts')
const union = typeSource.match(/export type ItineraryMoment =([^;]+);/)[1]
const moments = [...union.matchAll(/"([a-z-]+)"/g)].map((match) => match[1])

const sprite = read('../../../../public/images/moment-icons.svg')
const symbols = [...sprite.matchAll(/<symbol id="([a-z-]+)"/g)].map((match) => match[1])

const badge = read('./ItineraryMomentBadge.tsx')

test('every itinerary moment has an icon in the sprite, and nothing else does', () => {
  assert.deepEqual([...symbols].sort(), [...moments].sort())
})

test('every itinerary moment has a default badge label', () => {
  for (const moment of moments) {
    assert.match(badge, new RegExp(`(^|\\s)"?${moment}"?: "`, 'm'), `no label for ${moment}`)
  }
})
