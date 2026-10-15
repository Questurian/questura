import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

function read(file) {
  return readFileSync(fileURLToPath(new URL(`./components/${file}`, import.meta.url)), 'utf8')
}

// The comments explain the useId() rule, so match code only.
function code(file) {
  return read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

// A `useId()` inside a next/dynamic chunk hashes a different tree position on
// the client: the chunk is still loading when hydration reaches it, React
// replays that step, and the replay forgets the form was the second of
// next/dynamic's two server-side siblings. Every article page logged a
// hydration mismatch for the label/input ids. The ids are made by the wrapper,
// which is in the page's own bundle and never suspends.
test('the lazily loaded signup form makes no ids of its own', () => {
  assert.doesNotMatch(
    code('NewsletterSignupForm.tsx'),
    /\buseId\s*\(/,
    'NewsletterSignupForm is loaded through next/dynamic: take its ids from the idPrefix prop',
  )
})

test('the wrapper makes the ids and hands them to the chunk', () => {
  const source = code('LazyNewsletterSignupForm.tsx')
  assert.match(source, /const idPrefix = useId\(\)/, 'LazyNewsletterSignupForm must call useId() itself')
  assert.match(source, /idPrefix=\{idPrefix\}/, 'LazyNewsletterSignupForm must pass its id to the form')
})
