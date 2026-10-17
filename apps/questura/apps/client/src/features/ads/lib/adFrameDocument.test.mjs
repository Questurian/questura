import assert from 'node:assert/strict'
import test from 'node:test'
import { adFrameDocument } from './adFrameDocument.ts'

const unit = { key: '0123456789abcdef0123456789abcdef', width: 728, height: 90 }

test('the frame sets its own atOptions, then loads that unit', () => {
  const html = adFrameDocument(unit, 'https://www.highperformanceformat.com')
  assert.match(
    html,
    /<script>atOptions=\{"key":"0123456789abcdef0123456789abcdef","format":"iframe","height":90,"width":728,"params":\{\}\};<\/script>/,
  )
  assert.match(
    html,
    /<script src="https:\/\/www\.highperformanceformat\.com\/0123456789abcdef0123456789abcdef\/invoke\.js"><\/script>/,
  )
  // Settings before the script that reads them.
  assert.ok(html.indexOf('atOptions=') < html.indexOf('invoke.js'))
})

test('clicks open a new tab', () => {
  assert.match(adFrameDocument(unit, 'https://x.example'), /<base target="_blank">/)
})

test('only the origin of the script address is used', () => {
  const html = adFrameDocument(unit, 'https://x.example/some/path?q=1')
  assert.match(html, /src="https:\/\/x\.example\/0123456789abcdef0123456789abcdef\/invoke\.js"/)
})

test('a key that could break out of the script is refused', () => {
  assert.throws(() => adFrameDocument({ ...unit, key: '"></script><script>alert(1)' }, 'https://x.example'))
  assert.throws(() => adFrameDocument({ ...unit, key: '' }, 'https://x.example'))
})
