import assert from 'node:assert/strict'
import test from 'node:test'
import { notifyBookmarkWrite, onBookmarkWrite } from './bookmarkCacheEvents.ts'

test('public writes work before account cache exists; a registered cache hears every later write', () => {
  assert.doesNotThrow(notifyBookmarkWrite)
  let invalidations = 0
  const stop = onBookmarkWrite(() => { invalidations += 1 })
  notifyBookmarkWrite(); notifyBookmarkWrite()
  assert.equal(invalidations, 2)
  stop()
  notifyBookmarkWrite()
  assert.equal(invalidations, 2)
})
