import assert from 'node:assert/strict'
import test from 'node:test'
import { blurbHtml, lexicalToHtml } from './lexicalHtml.ts'

const text = (value, format = 0) => ({ type: 'text', text: value, format, mode: 'normal', style: '', detail: 0, version: 1 })
const paragraph = (...children) => ({ type: 'paragraph', format: '', indent: 0, version: 1, children })
const doc = (...children) => ({ root: { type: 'root', format: '', indent: 0, version: 1, children } })

// The live 5-days itinerary's stay blurb, shape for shape: this object used
// to reach dangerouslySetInnerHTML and print "[object Object]".
test('a Lexical stay blurb renders as HTML, never as [object Object]', () => {
  const html = blurbHtml(doc(paragraph(text('A quiet base near the malecón.'))))
  assert.equal(html, '<p>A quiet base near the malecón.</p>')
})

test('an HTML string from the server passes through untouched', () => {
  assert.equal(blurbHtml('<p>Already <strong>HTML</strong></p>'), '<p>Already <strong>HTML</strong></p>')
})

test('missing, empty and unrecognised blurbs render nothing', () => {
  for (const value of [undefined, null, '', '   ', {}, { root: null }, doc(), doc(paragraph()), 42]) {
    assert.equal(blurbHtml(value), null, JSON.stringify(value))
  }
})

test('text formats, headings, lists, quotes and line breaks', () => {
  const html = lexicalToHtml(
    doc(
      { type: 'heading', tag: 'h3', children: [text('Why stay')] },
      paragraph(text('bold', 1), text(' and '), text('italic', 2), { type: 'linebreak' }, text('next')),
      { type: 'list', listType: 'bullet', children: [{ type: 'listitem', children: [text('pool')] }] },
      { type: 'list', listType: 'number', children: [{ type: 'listitem', children: [text('one')] }] },
      { type: 'quote', children: [text('lovely')] },
    ),
  )
  assert.equal(
    html,
    '<h3>Why stay</h3>' +
      '<p><strong>bold</strong> and <em>italic</em><br>next</p>' +
      '<ul><li>pool</li></ul><ol><li>one</li></ol><blockquote>lovely</blockquote>',
  )
})

test('text is escaped and unsafe links lose their href', () => {
  const html = lexicalToHtml(
    doc(
      paragraph(text('<script>alert(1)</script>')),
      paragraph({ type: 'link', fields: { url: 'javascript:alert(1)' }, children: [text('bad')] }),
      paragraph({ type: 'link', fields: { url: 'https://example.com/?a=1&b="2"', newTab: true }, children: [text('good')] }),
      paragraph({ type: 'autolink', fields: { url: '/peru/lima' }, children: [text('local')] }),
    ),
  )
  assert.equal(
    html,
    '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>' +
      '<p>bad</p>' +
      '<p><a href="https://example.com/?a=1&amp;b=&quot;2&quot;" target="_blank" rel="noopener noreferrer">good</a></p>' +
      '<p><a href="/peru/lima">local</a></p>',
  )
})

test('unknown element nodes keep their text, unknown markup is never emitted', () => {
  assert.equal(
    lexicalToHtml(doc({ type: 'mystery-block', tag: 'iframe', children: [paragraph(text('kept'))] })),
    '<p>kept</p>',
  )
  assert.equal(lexicalToHtml(doc({ type: 'heading', tag: 'script', children: [text('x')] })), '<h3>x</h3>')
})
