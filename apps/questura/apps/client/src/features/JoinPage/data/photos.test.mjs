import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSrcSet } from '../../../components/media/imageSrcSet.ts'
import { PHOTOS } from './photos.ts'

test('every /join photo is a CDN variant with a width ladder, so phones never get the full file', () => {
  for (const [name, photo] of Object.entries(PHOTOS)) {
    assert.match(photo.src, /^https:\/\/questurian-cdn\.b-cdn\.net\/media\//, name)
    assert.ok(buildSrcSet(photo.src), `${name}: ${photo.src} has no srcSet`)
    assert.ok(photo.width > 0 && photo.height > 0, `${name} has its pixel size`)
  }
})

// The old page showed a beach in Rio and Mexican food as Lima's (handoff 03).
test('none of the old page\'s wrong photos come back', () => {
  const files = Object.values(PHOTOS).map((photo) => photo.src)
  for (const wrong of ['location-561ma2', 'al-pastor-on-the-trompo', 'photo-4717161myg', 'maps.googleapis']) {
    assert.ok(!files.some((src) => src.includes(wrong)), wrong)
  }
})
