import assert from 'node:assert/strict'
import test from 'node:test'
import { findHotelRuns } from './hotelRuns.ts'

const text = (id) => ({ id, blockType: 'text', content: '<p>Prose.</p>' })
const hotel = (id, title = id) => ({ id, blockType: 'hotel-card', hotel: { title } })

test('two or more hotels in a row become one run, held by the first card', () => {
  const runs = findHotelRuns([text('a'), hotel('h1'), hotel('h2'), hotel('h3'), text('b')])

  assert.deepEqual([...runs.starts.keys()], [1])
  assert.deepEqual(runs.starts.get(1).map((h) => h.title), ['h1', 'h2', 'h3'])
  assert.deepEqual([...runs.members], [2, 3])
})

test('a lone hotel stays a card', () => {
  const runs = findHotelRuns([text('a'), hotel('h1'), text('b'), hotel('h2')])

  assert.equal(runs.starts.size, 0)
  assert.equal(runs.members.size, 0)
})

test('prose between hotels splits them into separate runs', () => {
  const runs = findHotelRuns([hotel('h1'), hotel('h2'), text('a'), hotel('h3'), hotel('h4')])

  assert.deepEqual([...runs.starts.keys()], [0, 3])
  assert.deepEqual([...runs.members], [1, 4])
})

test('a missing hotel is left out, and a run of one real hotel stays a card', () => {
  const gone = { id: 'gone', blockType: 'hotel-card', hotel: null }

  const mixed = findHotelRuns([hotel('h1'), gone, hotel('h2')])
  assert.deepEqual(mixed.starts.get(0).map((h) => h.title), ['h1', 'h2'])
  assert.deepEqual([...mixed.members], [1, 2])

  const lone = findHotelRuns([hotel('h1'), gone])
  assert.equal(lone.starts.size, 0)
})
