import assert from 'node:assert/strict'
import test from 'node:test'
import { writeHint } from './identityHint.ts'

test('a new answer restamps the open page, not only the next one', () => {
  const dataset = { identity: 'user' }
  globalThis.document = { documentElement: { dataset } }
  try {
    const storage = { getItem: () => null, setItem: () => {} }
    writeHint('member', storage)
    assert.equal(dataset.identity, 'member')
    writeHint('anon', storage)
    assert.equal(dataset.identity, undefined)
    writeHint('member', { getItem: () => null, setItem: () => { throw new Error('blocked') } })
    assert.equal(dataset.identity, 'member', 'blocked storage still fixes this page')
  } finally {
    delete globalThis.document
  }
})
