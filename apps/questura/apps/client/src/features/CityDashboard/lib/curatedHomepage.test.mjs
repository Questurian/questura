import assert from 'node:assert/strict'
import test from 'node:test'
import { curatedHomepage } from './curatedHomepage.ts'

test('a homepage with blocks is curated', () => {
  const data = { location: { label: 'Lima' }, pageBlocks: [{ blockType: 'hero' }] }
  assert.equal(curatedHomepage(data), data)
})

// /colombia/medellin and /mexico/mexico-city rendered blank: the API answered
// with an enabled homepage whose pageBlocks was []. No blocks means the
// article-list fallback, same as no homepage.
test('a homepage with no blocks falls back like a missing one', () => {
  for (const data of [
    null,
    undefined,
    { location: { label: 'Medellín' }, pageBlocks: [] },
    { location: { label: 'Medellín' }, pageBlocks: null },
    { location: { label: 'Medellín' } },
  ]) {
    assert.equal(curatedHomepage(data), null, JSON.stringify(data))
  }
})
