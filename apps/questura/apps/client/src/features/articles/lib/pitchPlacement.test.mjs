import assert from 'node:assert/strict'
import test from 'node:test'
import { findPitchSlots } from './pitchPlacement.ts'

const text = (content) => ({ blockType: 'text', content })
const noRuns = { proseRuns: new Map() }

test('the box sits where the first and second sections end', () => {
  const first = '<p>Intro</p><h2>Plan</h2><h3>When</h3><h2>Stay</h2><p>Rooms</p>'
  const blocks = [text(first), { blockType: 'image' }, text('<h2>Eat</h2><h2>See</h2>')]

  assert.deepEqual(findPitchSlots(blocks, noRuns), [
    { blockIndex: 0, runIndex: 0, offset: first.indexOf('<h2>Stay') },
    { blockIndex: 2, runIndex: 0, offset: 0 },
  ])
})

test('two can land in one block', () => {
  const html = '<h2>A</h2><h2>B</h2><h2>C</h2><h2>D</h2>'
  assert.deepEqual(findPitchSlots([text(html)], noRuns).map((slot) => slot.offset), [10, 20])
})

test('a short article has none mid-page', () => {
  assert.deepEqual(findPitchSlots([text('<h2>A</h2><h2>B</h2><h2>C</h2>')], noRuns), [])
})
