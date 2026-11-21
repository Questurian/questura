import assert from 'node:assert/strict'
import test from 'node:test'

import { markPhotoReady } from './photoReady.ts'
import { PHOTO_READY_SCRIPT } from './photoReadyScript.ts'

function fakeImage({ fade = true, complete = true, naturalWidth = 800, tagName = 'IMG' } = {}) {
  const attributes = new Map(fade ? [['data-fade', '']] : [])
  return {
    tagName,
    complete,
    naturalWidth,
    hasAttribute: (name) => attributes.has(name),
    setAttribute: (name, value) => attributes.set(name, value),
    attributes,
  }
}

test('a faded photo that has decoded is marked ready', () => {
  const image = fakeImage()
  assert.equal(markPhotoReady(image), true)
  assert.equal(image.attributes.has('data-loaded'), true)
})

test('a photo still downloading, or one that failed, stays hidden', () => {
  const loading = fakeImage({ complete: false, naturalWidth: 0 })
  const failed = fakeImage({ complete: true, naturalWidth: 0 })
  assert.equal(markPhotoReady(loading), false)
  assert.equal(markPhotoReady(failed), false)
  assert.equal(loading.attributes.has('data-loaded'), false)
  assert.equal(failed.attributes.has('data-loaded'), false)
})

test('images that did not opt in are left alone', () => {
  const image = fakeImage({ fade: false })
  assert.equal(markPhotoReady(image), false)
  assert.equal(markPhotoReady(null), false)
})

test('the head script marks photos from a capture-phase load listener', () => {
  const listeners = []
  const document = {
    addEventListener: (type, listener, capture) => listeners.push({ type, listener, capture }),
  }
  new Function('document', PHOTO_READY_SCRIPT)(document)

  assert.equal(listeners.length, 1)
  assert.equal(listeners[0].type, 'load')
  assert.equal(listeners[0].capture, true)

  const ready = fakeImage()
  const broken = fakeImage({ naturalWidth: 0 })
  const plain = fakeImage({ fade: false })
  for (const target of [ready, broken, plain]) listeners[0].listener({ target })

  assert.equal(ready.attributes.has('data-loaded'), true)
  assert.equal(broken.attributes.has('data-loaded'), false)
  assert.equal(plain.attributes.has('data-loaded'), false)
})
