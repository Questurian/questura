import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

import { layoutSnapshot } from './mapSnapshot.ts'

const snapshot = {
  src: '/images/map-teasers/maps-1.webp',
  srcSmall: '/images/map-teasers/maps-1-782.webp',
  width: 782,
  height: 690,
  center: [-77.03, -12.1],
  zoom: 12,
}
const point = (id, lat, lng, extra = {}) => ({ id, lat, lng, inert: true, number: null, ...extra })

test('the picture centre lands in the middle of the frame', () => {
  const layout = layoutSnapshot(snapshot, [point('c', -12.1, -77.03)], { width: 782, height: 690 })
  assert.ok(Math.abs(layout.pins[0].x - 391) < 0.5)
  assert.ok(Math.abs(layout.pins[0].y - 345) < 0.5)
  assert.deepEqual(layout.image, { left: 0, top: 0, width: 782, height: 690 })
})

test('north is up and east is right', () => {
  const layout = layoutSnapshot(snapshot, [point('n', -12.05, -77.03), point('e', -12.1, -76.98)], { width: 782, height: 690 })
  const [north, east] = layout.pins
  assert.ok(north.y < 345)
  assert.ok(east.x > 391)
})

test("a phone's short split view keeps the top of the picture and centres it across", () => {
  const layout = layoutSnapshot(snapshot, [point('c', -12.1, -77.03)], { width: 390, height: 300 })
  assert.equal(layout.image.top, 0)
  assert.ok(Math.abs(layout.image.left + layout.image.width / 2 - 195) < 0.5)
  assert.ok(layout.image.width >= 390 && layout.image.height >= 300)
})

test('a focus strip slides the picture to centre the places in it, never past its edges', () => {
  const box = { width: 390, height: 300 }
  const places = [point('a', -12.08, -77.03), point('b', -12.12, -77.03)]
  const low = layoutSnapshot(snapshot, places, box, { top: 200, bottom: 280 })
  const high = layoutSnapshot(snapshot, places, box, { top: 20, bottom: 100 })
  for (const layout of [low, high]) {
    assert.ok(layout.image.top <= 0, 'the picture never leaves a gap at the top')
    assert.ok(layout.image.top + layout.image.height >= box.height - 0.01, 'or at the bottom')
  }
  const middle = (layout) => (layout.pins[0].y + layout.pins[1].y) / 2
  assert.ok(middle(high) < middle(low), 'a higher strip draws the places higher')
})

test('a place outside the picture means the picture cannot be used', () => {
  assert.equal(layoutSnapshot(snapshot, [point('far', -13.5, -77.03)], { width: 782, height: 690 }), null)
})

test('an open place keeps its number; a locked one does not', () => {
  const layout = layoutSnapshot(
    snapshot,
    [point('free', -12.1, -77.03, { inert: false, number: 1 }), point('locked', -12.11, -77.02)],
    { width: 782, height: 690 },
  )
  assert.deepEqual(
    layout.pins.map((pin) => [pin.id, pin.free, pin.number]),
    [
      ['free', true, 1],
      ['locked', false, null],
    ],
  )
})

// The manifest is written by apps/e2e/scripts/render-map-teasers.mjs. A
// listed picture that is not in public/ would draw a broken image over a
// locked guide for every non-member.
test('every listed map picture exists in public/', () => {
  const manifest = JSON.parse(readFileSync(new URL('../data/mapTeasers.json', import.meta.url), 'utf8'))
  for (const [key, entry] of Object.entries(manifest)) {
    assert.match(key, /^(maps|itineraries):\d+$/)
    for (const src of [entry.src, entry.srcSmall]) {
      assert.ok(existsSync(new URL(`../../../../public${src}`, import.meta.url)), `${key}: ${src} is missing`)
    }
  }
})
