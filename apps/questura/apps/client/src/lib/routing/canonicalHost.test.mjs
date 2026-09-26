import assert from 'node:assert/strict'
import test from 'node:test'

import { canonicalRedirect } from './canonicalHost.ts'

const APP = 'https://www.questurian.com'
const at = (host, proto, pathname = '/join', search = '') =>
  canonicalRedirect({ appUrl: APP, host, proto, pathname, search })

test('the bare domain goes to www, path and query intact', () => {
  assert.equal(at('questurian.com', 'https', '/purchase/monthly', '?x=1'), 'https://www.questurian.com/purchase/monthly?x=1')
})

test('plain http on either host goes to https www', () => {
  assert.equal(at('www.questurian.com', 'http'), 'https://www.questurian.com/join')
  assert.equal(at('questurian.com', 'http:'), 'https://www.questurian.com/join')
})

test('the canonical address over https is left alone', () => {
  assert.equal(at('www.questurian.com', 'https'), null)
  assert.equal(at('WWW.questurian.com:443', 'https'), null)
})

test('other hosts and local dev are never redirected', () => {
  assert.equal(at('app.readiness.localhost', 'http'), null)
  assert.equal(at('evil.example', 'http'), null)
  assert.equal(canonicalRedirect({ appUrl: 'http://localhost:3000', host: 'localhost:3000', proto: 'http', pathname: '/', search: '' }), null)
  assert.equal(canonicalRedirect({ appUrl: undefined, host: 'questurian.com', proto: 'https', pathname: '/', search: '' }), null)
})
