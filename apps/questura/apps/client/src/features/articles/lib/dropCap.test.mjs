import assert from 'node:assert/strict'
import test from 'node:test'
import { withDropCap } from './dropCap.ts'

test('swaps the first letter of the first paragraph for the plate', () => {
  const html = withDropCap('<p>Spend your day.</p><p>Then more.</p>')
  assert.match(html, /^<p><span class="drop-cap" aria-hidden="true">/)
  assert.match(html, /<text x="24\.7" y="80" font-size="84\.7">S<\/text>/)
  assert.match(html, /<span class="sr-only">S<\/span>pend your day\.<\/p><p>Then more\.<\/p>$/)
})

test('steps over a link or bold that opens the paragraph', () => {
  const html = withDropCap('<p dir="ltr"><a href="/x"><strong>Lima</strong></a> faces west.</p>')
  assert.match(html, /<strong><span class="drop-cap"/)
  assert.match(html, /<span class="sr-only">L<\/span>ima<\/strong>/)
})

test('skips headings before the first paragraph', () => {
  const html = withDropCap('<h2>Title</h2><p>One day.</p>')
  assert.match(html, /^<h2>Title<\/h2><p><span class="drop-cap/)
})

test('leaves a paragraph that opens with a quote mark or entity alone', () => {
  assert.equal(withDropCap('<p>&quot;Go early.&quot;</p>'), '<p>&quot;Go early.&quot;</p>')
  assert.equal(withDropCap('<p>“Go early.”</p>'), '<p>“Go early.”</p>')
  assert.equal(withDropCap('<h2>Only a heading</h2>'), '<h2>Only a heading</h2>')
  assert.equal(withDropCap('<p></p>'), '<p></p>')
})

test('centres letters outside the table on their box', () => {
  const html = withDropCap('<p>Évora.</p>')
  assert.match(html, /text-anchor="middle">É<\/text>/)
})
