import assert from 'node:assert/strict'
import test from 'node:test'
import { findContentsSlot } from './contentsPlacement.ts'

const text = (content) => ({ blockType: 'text', content })
const image = () => ({ blockType: 'image' })
const noRuns = { proseRuns: new Map() }

test('the box goes where the first H2 starts, inside the intro block', () => {
  const intro = '<p>Intro.</p><p>More.</p><h2 id="plan">Plan</h2><p>Body.</p>'
  const slot = findContentsSlot([text(intro), text('<h2>Later</h2>')], noRuns)

  assert.deepEqual(slot, { blockIndex: 0, runIndex: 0, offset: intro.indexOf('<h2') })
})

test('an H2 that opens a later block puts the box before that block', () => {
  const slot = findContentsSlot([text('<p>Intro.</p>'), image(), text('<h2>Plan</h2>')], noRuns)

  assert.deepEqual(slot, { blockIndex: 2, runIndex: 0, offset: 0 })
})

test('an ad split is respected: the slot names the run that holds the H2', () => {
  const plan = { proseRuns: new Map([[0, ['<p>Intro.</p>', '<p>More.</p><h2>Plan</h2>']]]) }
  const slot = findContentsSlot([text('<p>Intro.</p><p>More.</p><h2>Plan</h2>')], plan)

  assert.deepEqual(slot, { blockIndex: 0, runIndex: 1, offset: '<p>More.</p>'.length })
})

test('with no H2 in the rendered blocks the box opens the body', () => {
  const slot = findContentsSlot([text('<p>Intro.</p>'), text('<h3>Sub</h3><h20>x</h20>')], noRuns)

  assert.deepEqual(slot, { blockIndex: 0, runIndex: 0, offset: 0 })
})

test('no blocks, no slot', () => {
  assert.equal(findContentsSlot([], noRuns), null)
})
