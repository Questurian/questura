import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)

test('the App Router outage boundary offers retry and home without exposing the server error', () => {
  const ts = require('typescript')
  const source = readFileSync(new URL('./error.tsx', import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  })
  const loaded = { exports: {} }
  new Function('require', 'exports', outputText)(
    (name) => name === '@/lib/observability/reportBrowserError' ? { reportBrowserError() {} } : require(name),
    loaded.exports,
  )
  const { createElement } = require('react')
  const { renderToStaticMarkup } = require('react-dom/server')
  const html = renderToStaticMarkup(createElement(loaded.exports.default, {
    error: Object.assign(new Error('private server details'), { digest: 'outage-reference' }),
    retry() {},
  }))
  assert.match(html, /This page could not be shown just now/)
  assert.match(html, /<button[^>]*>Try again<\/button>/)
  assert.match(html, /<a[^>]*href="\/"[^>]*>Go to the homepage<\/a>/)
  assert.match(html, /Reference outage-reference/)
  assert.doesNotMatch(html, /private server details/)
})
