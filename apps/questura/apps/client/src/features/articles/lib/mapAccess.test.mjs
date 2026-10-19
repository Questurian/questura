import assert from 'node:assert/strict'
import test from 'node:test'

import { mapAccessFor } from './mapAccess.ts'

test('a free guide always gets the Google map', () => {
  for (const phase of ['identifying', 'anonymous', 'unverified', 'loading', 'ready', 'failed']) {
    assert.equal(mapAccessFor(false, phase), 'open')
  }
})

test('a locked guide gets the teaser only once the reader is known not to be a member', () => {
  assert.equal(mapAccessFor(true, 'anonymous'), 'teaser')
  assert.equal(mapAccessFor(true, 'ready'), 'open')
})

// A paying member must never see "become a member", and nobody gets a billed
// map before we know they are owed one.
test('a locked guide shows plain paper while the answer is not in', () => {
  for (const phase of ['identifying', 'unverified', 'loading', 'failed']) {
    assert.equal(mapAccessFor(true, phase), 'waiting')
  }
})
