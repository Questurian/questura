import assert from 'node:assert/strict'
import test from 'node:test'
import { adjacentStops, classifySwipe, SWIPE_MIN_DISTANCE } from './ListicleMapSwipe.ts'

const stops = [{ id: 'a' }, { id: 'b', inert: true }, { id: 'c' }, { id: 'd' }]

test('steps skip inert pins and stop at the ends', () => {
  assert.deepEqual(
    [adjacentStops(stops, 'a').previous, adjacentStops(stops, 'a').next?.id],
    [null, 'c'],
  )
  assert.equal(adjacentStops(stops, 'c').previous?.id, 'a')
  assert.equal(adjacentStops(stops, 'd').next, null)
})

test('with no active stop, forward starts at the first stop', () => {
  const { previous, next } = adjacentStops(stops, null)
  assert.equal(previous, null)
  assert.equal(next?.id, 'a')
})

test('a leftward swipe is next, rightward is previous', () => {
  assert.equal(classifySwipe(-80, 10), 'next')
  assert.equal(classifySwipe(80, -10), 'previous')
})

test('short or mostly vertical drags are not swipes', () => {
  assert.equal(classifySwipe(-(SWIPE_MIN_DISTANCE - 1), 0), null)
  assert.equal(classifySwipe(-60, 60), null)
  assert.equal(classifySwipe(0, -200), null)
})
