import assert from 'node:assert/strict'
import test from 'node:test'
import { retryOriginalImage } from './retryOriginalImage.ts'

function element(attributes) {
  const attrs = new Map(Object.entries(attributes))
  return {
    getAttribute: name => attrs.get(name) ?? null,
    setAttribute: (name, value) => attrs.set(name, value),
    removeAttribute: name => attrs.delete(name),
  }
}

function image(attributes, sources = []) {
  return { ...element(attributes), closest: () => ({ querySelectorAll: () => sources }) }
}

test('missing rung retries the base variant instead of reporting failure', () => {
  const img = image({ src: 'composite_wide.webp', srcset: 'composite_wide_w384.webp 384w', sizes: '384px' })
  assert.equal(retryOriginalImage(img), true)
  assert.equal(img.getAttribute('srcset'), null)
  assert.equal(img.getAttribute('sizes'), null)
  assert.equal(img.getAttribute('src'), 'composite_wide.webp')
  assert.equal(retryOriginalImage(img), false, 'base failure must reach caller, never loop')
})

test('picture sources fall back to their own crop, not the img crop', () => {
  const source = element({
    srcset: 'composite_square_w384.webp 384w',
    sizes: '384px',
    'data-fallback-src': 'composite_square.webp',
  })
  const img = image({ src: 'composite_thumbnail.webp', srcset: 'composite_thumbnail_w384.webp 384w' }, [source])
  assert.equal(retryOriginalImage(img), true)
  assert.equal(source.getAttribute('srcset'), 'composite_square.webp')
  assert.equal(source.getAttribute('sizes'), null)
  assert.equal(retryOriginalImage(img), false)
})

test('a source without a ladder is left alone and not retried', () => {
  const source = element({ srcset: 'logo.png', 'data-fallback-src': 'logo.png' })
  assert.equal(retryOriginalImage(image({ src: 'logo.png' }, [source])), false)
})

test('a failed base image is reported without retry', () => {
  assert.equal(retryOriginalImage(image({ src: 'missing.webp' })), false)
})

test('a new src gets its own retry', () => {
  const img = image({ src: 'a_wide.webp', srcset: 'a_wide_w384.webp 384w' })
  assert.equal(retryOriginalImage(img), true)
  img.setAttribute('src', 'b_wide.webp')
  img.setAttribute('srcset', 'b_wide_w384.webp 384w')
  assert.equal(retryOriginalImage(img), true)
})
