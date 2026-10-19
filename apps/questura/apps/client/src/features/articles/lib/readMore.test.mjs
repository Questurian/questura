import assert from 'node:assert/strict'
import test from 'node:test'
import { isReadMoreUrl } from './readMore.ts'

test('Read more accepts article paths and web URLs', () => {
  for (const url of ['/peru/lima', 'https://www.questurian.com/peru/lima?x=1#food', 'http://localhost:3000/lima']) {
    assert.equal(isReadMoreUrl(url), true, url)
  }
})

test('Read more refuses unsafe or malformed destinations', () => {
  for (const url of ['', 'javascript:alert(1)', 'data:text/html,hi', '//evil.test', '/\\evil.test', '/has space', 'https://', 'https://user:pass@example.com', 'https://x.test/\tpath']) {
    assert.equal(isReadMoreUrl(url), false, url)
  }
})
