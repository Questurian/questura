import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('./route.ts', import.meta.url), 'utf8')

function handler() {
  const calls = []
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const loadedModule = { exports: {} }
  const dependencies = {
    'next/cache': {
      revalidateTag: (...args) => calls.push(['tag', ...args]),
      revalidatePath: (...args) => calls.push(['path', ...args]),
    },
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
  }
  new Function('require', 'module', 'exports', 'process', outputText)(
    (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`)
      return dependencies[name]
    },
    loadedModule,
    loadedModule.exports,
    { env: { QUESTURA_REVALIDATION_SECRET: 'revalidation-test-secret' } },
  )
  return { post: loadedModule.exports.POST, calls }
}

function request(body, secret = 'revalidation-test-secret') {
  return new Request('http://localhost/api/revalidate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-revalidation-secret': secret },
    body: JSON.stringify(body),
  })
}

test('publishing immediately expires each tag and invalidates each path', async () => {
  const { post, calls } = handler()
  const response = await post(request({ tags: ['article:lima', 'article:lima'], paths: ['/peru/lima'] }))
  assert.equal(response.status, 200)
  assert.deepEqual(calls, [
    ['tag', 'article:lima', { expire: 0 }],
    ['path', '/peru/lima'],
  ])
})

test('unauthorized or invalid publishing requests cannot invalidate caches', async () => {
  const { post, calls } = handler()
  assert.equal((await post(request({ tags: ['article:lima'] }, 'wrong-secret'))).status, 401)
  assert.equal((await post(request({ tags: ['article:lima'], paths: ['https://example.com'] }))).status, 400)
  assert.deepEqual(calls, [])
})
