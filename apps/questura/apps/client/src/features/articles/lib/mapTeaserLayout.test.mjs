import assert from 'node:assert/strict'
import test from 'node:test'

import { layoutMapTeaser } from './mapTeaserLayout.ts'

const point = (id, lat, lng, area, extra = {}) => ({ id, lat, lng, inert: true, number: null, area, ...extra })

// Shaped like a real Lima guide: a centre to the north, a cluster in
// Miraflores, one place out in Barranco.
const lima = [
  point('a', -12.047, -77.033, 'Lima Centro'),
  point('b', -12.089, -77.027, 'Lince'),
  point('c', -12.116, -77.045, 'Miraflores'),
  point('d', -12.124, -77.027, 'Miraflores'),
  point('e', -12.113, -77.031, 'Miraflores'),
  point('f', -12.111, -77.049, 'Miraflores'),
  point('g', -12.148, -77.022, 'Barranco'),
]

const desktop = { width: 780, height: 690, compact: false }

test('keeps north up and every pin inside the band above the call to join', () => {
  const { pins } = layoutMapTeaser(lima, desktop)
  const byId = Object.fromEntries(pins.map((pin) => [pin.id, pin]))

  assert.ok(byId.a.y < byId.b.y && byId.b.y < byId.g.y, 'further south is lower')
  for (const pin of pins) {
    assert.ok(pin.y >= 9 - 0.01 && pin.y <= 56 + 0.01, `pin ${pin.id} at ${pin.y}% is outside the band`)
    assert.ok(pin.x >= 8 - 0.01 && pin.x <= 92 + 0.01, `pin ${pin.id} at ${pin.x}% is outside the sides`)
  }
})

test('names each neighborhood once, beside one of its own pins', () => {
  const { labels, pins } = layoutMapTeaser(lima, desktop)

  assert.deepEqual(labels.map((label) => label.text).sort(), ['Barranco', 'Lima Centro', 'Lince', 'Miraflores'])
  assert.equal(labels.find((label) => label.text === 'Miraflores').big, true)
  const areaOf = Object.fromEntries(lima.map((p) => [p.id, p.area]))
  for (const label of labels) {
    const own = pins.filter((pin) => areaOf[pin.id] === label.text)
    assert.ok(
      own.some((pin) => Math.abs(((pin.y - label.y) / 100) * desktop.height) < 10),
      `${label.text} is not on the line of any of its pins`,
    )
  }
})

test('a spread-out neighborhood is named at a pin, not in the gap between its pins', () => {
  const spread = [point('n', -12.0, -77.0, 'Wide'), point('s', -12.2, -77.0, 'Wide'), point('m', -12.1, -76.95, 'Other')]
  const { labels, pins } = layoutMapTeaser(spread, desktop)
  const wide = labels.find((label) => label.text === 'Wide')
  const ys = pins.filter((pin) => pin.id !== 'm').map((pin) => pin.y)
  assert.ok(ys.some((y) => Math.abs(y - wide.y) < 0.5))
})

test("a neighbor's pin on the same line pushes the name past it", () => {
  const { labels, pins } = layoutMapTeaser(lima, desktop)
  for (const label of labels) {
    const y = (label.y / 100) * desktop.height
    for (const pin of pins) {
      if (Math.abs((pin.y / 100) * desktop.height - y) >= 10) continue
      if (label.side === 'right') assert.ok(label.x > pin.x, `${label.text} starts on a pin`)
      else assert.ok(label.x < pin.x, `${label.text} ends on a pin`)
    }
  }
})

test('pushes two names on the same side apart', () => {
  const crowded = [point('a', -12.1, -77.0, 'North'), point('b', -12.1001, -77.0, 'South')]
  const { labels } = layoutMapTeaser(crowded, desktop)
  const [first, second] = labels.sort((x, y) => x.y - y.y)
  assert.ok(((second.y - first.y) / 100) * desktop.height >= 19.9)
})

test('the phone drops the names and keeps a numbered, clickable pin for an open place', () => {
  const withFree = [point('free', -12.05, -77.03, 'Lima Centro', { inert: false, number: 1 }), ...lima.slice(1)]
  const { pins, labels } = layoutMapTeaser(withFree, { width: 390, height: 300, compact: true })

  assert.deepEqual(labels, [])
  assert.deepEqual(
    pins.filter((pin) => pin.free).map((pin) => [pin.id, pin.number]),
    [['free', 1]],
  )
  assert.ok(pins.filter((pin) => !pin.free).every((pin) => pin.number === null))
})

test('one pin, or no room, never divides by zero', () => {
  const [only] = layoutMapTeaser([point('a', -12.1, -77.0, null)], desktop).pins
  assert.ok(Number.isFinite(only.x) && Number.isFinite(only.y))
  assert.deepEqual(layoutMapTeaser(lima, { width: 0, height: 0, compact: false }), { pins: [], labels: [] })
})
