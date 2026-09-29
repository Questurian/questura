import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const here = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.resolve(here, '../..')
const read = (relative) => readFileSync(path.join(here, relative), 'utf8')

function sourceFiles(dir) {
  const found = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) found.push(...sourceFiles(full))
    else if (/\.(tsx?|mjs)$/.test(entry)) found.push(full)
  }
  return found
}

/**
 * The DEV switcher can set the signed-in reader's membership. Its route
 * refuses on live on its own (404 outside a Mac), but the client half must not
 * ship either: `process.env.NODE_ENV` is replaced at build time, so a dynamic
 * import behind that check is dropped from the live bundle. A plain import
 * anywhere would put it back. These tests fail if either guard is removed.
 */
test('the switcher is loaded only behind the development check', () => {
  const source = read('./DevTools.tsx')
  assert.match(
    source,
    /process\.env\.NODE_ENV === "development"\s*\?\s*dynamic\(\(\) => import\("\.\/DevMembershipSwitcher"\)/,
  )
})

test('nothing else imports the switcher', () => {
  const importers = sourceFiles(SRC)
    .filter((file) => !file.endsWith('DevTools.tsx') && !file.endsWith('.test.mjs'))
    .filter((file) => readFileSync(file, 'utf8').includes('DevMembershipSwitcher'))
    .map((file) => path.relative(SRC, file))
  assert.deepEqual(importers, ['features/DevTools/DevMembershipSwitcher.tsx'])
})

test('the switcher renders nothing off localhost', () => {
  const source = read('./DevMembershipSwitcher.tsx')
  assert.match(source, /LOCAL_HOSTS\.has\(window\.location\.hostname\)/)
  assert.match(source, /if \(!onLocalhost\) return null;/)
})
