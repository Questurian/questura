import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const { createElement } = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const source = readFileSync(new URL('./ImageAttribution.tsx', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
})
const outdir = join(process.cwd(), 'node_modules', '.cache', 'attribution-test')
mkdirSync(outdir, { recursive: true })
const outfile = join(outdir, `attribution-${process.pid}.mjs`)
writeFileSync(outfile, outputText)
const { ImageAttribution } = await import(pathToFileURL(outfile).href)
rmSync(outfile)
const render = (image) => renderToStaticMarkup(createElement(ImageAttribution, { image }))

test('four-photo composition shows original photographers once, separate editor, and all source positions', () => {
  const html = render({
    edit_credit: 'Alan',
    sources: ['Top left', 'Top right', 'Bottom left', 'Bottom right'].map((position, index) => ({
      position, title: `Photo ${index + 1}`, credit: index < 2 ? 'Maria' : 'Alex', url: 'https://photos.example/original',
    })),
  })
  assert.match(html, /Photos: Maria, Alex/)
  assert.match(html, /Composite \/ edit: Alan/)
  assert.equal((html.match(/<li>/g) ?? []).length, 4)
  assert.match(html, /<summary>Photo sources<\/summary>/)
  assert.match(html, /Bottom right: /)
  assert.match(html, /href="https:\/\/photos.example\/original"/)
  assert.match(html, /rel="noopener noreferrer"/)
})

test('unsafe URLs render plain attribution without executable links', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'https://secret@photos.example/original']) {
    const html = render({ sources: [{ position: 'Left', credit: 'Maria', url }] })
    assert.match(html, /Maria/)
    assert.doesNotMatch(html, /<a /)
  }
})

test('legacy photos retain credit; unattributed images render no extra chrome', () => {
  assert.match(render({ photographer_credit: 'Photo by Maria' }), /Photo by Maria/)
  assert.doesNotMatch(render({ photographer_credit: 'Photo by Maria' }), /Photo sources/)
  assert.equal(render({}), '')
})
