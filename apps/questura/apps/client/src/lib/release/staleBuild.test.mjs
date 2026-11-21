import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  RELOAD_KEY,
  RELOAD_WINDOW_MS,
  isMissingBuildFile,
  reloadForStaleBuild,
  shouldReloadForStaleBuild,
} from './staleBuild.ts'

// After a deploy the previous build's files answer 404 (live, 2026-11-21). A
// page from before the deploy then fails the first time it needs code it has
// not loaded, and a fresh load is the fix.

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v) } }
}

const chunkError = () => Object.assign(new Error('Loading chunk 6986 failed.\n(error: https://www.questurian.com/_next/static/chunks/6986-0718b620f1cba379.js)'), { name: 'ChunkLoadError' })

test('recognises each way a browser or bundler reports a missing build file', () => {
  for (const message of [
    'Loading chunk 6986 failed.',
    'Loading CSS chunk 12 failed.\n(https://www.questurian.com/_next/static/css/097247928ffcff95.css)',
    'Failed to load chunk /_next/static/chunks/abc.js from module 123',
    'Failed to fetch dynamically imported module: https://www.questurian.com/_next/static/chunks/a.js',
    'Importing a module script failed.',
    'error loading dynamically imported module',
  ]) assert.equal(isMissingBuildFile(new Error(message)), true, message)
  assert.equal(isMissingBuildFile(chunkError()), true)
})

test('ordinary failures are not mistaken for an old page', () => {
  for (const error of [new Error('Failed to fetch'), new TypeError('x is undefined'), 'Loading chunk 1 failed.', null, undefined, {}])
    assert.equal(isMissingBuildFile(error), false, String(error))
})

test('reloads once, then lets a second miss in the same tab reach the error page', () => {
  const storage = memoryStorage()
  const now = 1_000_000
  assert.equal(shouldReloadForStaleBuild(chunkError(), storage, now), true)

  let reloads = 0
  reloadForStaleBuild(storage, now, () => { reloads += 1 })
  assert.equal(reloads, 1)
  assert.equal(storage.data[RELOAD_KEY], String(now))

  assert.equal(shouldReloadForStaleBuild(chunkError(), storage, now + 2_000), false, 'no reload loop')
  assert.equal(shouldReloadForStaleBuild(chunkError(), storage, now + RELOAD_WINDOW_MS + 1), true, 'a later deploy may reload again')
})

test('never reloads for other errors, without storage, or when storage refuses', () => {
  assert.equal(shouldReloadForStaleBuild(new Error('boom'), memoryStorage(), 1), false)
  assert.equal(shouldReloadForStaleBuild(chunkError(), null, 1), false)
  const refusing = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') } }
  assert.equal(shouldReloadForStaleBuild(chunkError(), refusing, 1), false)

  let reloads = 0
  reloadForStaleBuild(refusing, 1, () => { reloads += 1 })
  reloadForStaleBuild(null, 1, () => { reloads += 1 })
  assert.equal(reloads, 0, 'without a guard written, no reload')
})

test('build files are cached as immutable so an old page keeps what it already loaded', () => {
  const headers = readFileSync(new URL('../../../public/_headers', import.meta.url), 'utf8')
  assert.match(headers, /^\/_next\/static\/\*\n\s+Cache-Control: public, max-age=31536000, immutable$/m)
})
