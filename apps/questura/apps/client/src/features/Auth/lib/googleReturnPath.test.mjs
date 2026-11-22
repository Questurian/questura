import assert from 'node:assert/strict'
import test from 'node:test'
import { googleReturnPath } from './googleReturnPath.ts'

test('a buyer keeps the guide they came from', () => {
  assert.equal(
    googleReturnPath('/purchase/monthly', '?returnTo=%2Fperu%2Flima%2Fguides%2Fg&error=x'),
    '/purchase/monthly?returnTo=%2Fperu%2Flima%2Fguides%2Fg',
  )
})

test('every other page comes back to its path alone', () => {
  assert.equal(googleReturnPath('/account', '?error=x'), '/account')
})

test('a returnTo off this site is dropped', () => {
  for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/a\\b', '/a b', '/\t/evil.example']) {
    assert.equal(googleReturnPath('/purchase/yearly', `?returnTo=${encodeURIComponent(bad)}`), '/purchase/yearly')
  }
})
