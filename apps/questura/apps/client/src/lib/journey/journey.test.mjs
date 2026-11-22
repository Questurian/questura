import assert from 'node:assert/strict'
import { test } from 'node:test'

import { currentVisit, isOff, turnOff, VISIT_GAP_MS } from './choice.ts'
import { campaignOf, isOwnDetailsPage, sourceOf, tapLabel } from './describe.ts'
import { whereFor } from './eligibility.ts'
import { createView, IDLE_MS } from './view.ts'

const headers = (values = {}) => ({ get: (name) => values[name] ?? null })
const storage = (values = {}) => {
  const kept = new Map(Object.entries(values))
  return { kept, getItem: (k) => kept.get(k) ?? null, setItem: (k, v) => kept.set(k, v), removeItem: (k) => kept.delete(k) }
}

test('only US readers on reader networks, without a privacy signal', () => {
  assert.equal(whereFor({ country: 'US', city: 'Miami', asn: 7922 }, headers()).record, true)
  assert.equal(whereFor({ country: 'BR' }, headers()).record, false)
  assert.equal(whereFor(undefined, headers()).record, false)
  assert.equal(whereFor({ country: 'US', asn: 32934 }, headers()).record, false)
  assert.equal(whereFor({ country: 'US' }, headers({ 'sec-gpc': '1' })).record, false)
  assert.equal(whereFor({ country: 'US' }, headers({ dnt: '1' })).record, false)
})

test('the clock counts only time on screen', () => {
  const view = createView(0)
  for (let s = 1; s <= 5; s += 1) view.tick(s * 1000, true)
  for (let s = 6; s <= 9; s += 1) view.tick(s * 1000, false)
  view.tick(10_000, true)
  assert.equal(view.snapshot().seconds, 6)
})

test('the clock stops when idle and after a sleep', () => {
  const idle = createView(0)
  for (let s = 1; s <= IDLE_MS / 1000 + 60; s += 1) idle.tick(s * 1000, true)
  assert.equal(idle.snapshot().seconds, IDLE_MS / 1000)

  const slept = createView(0)
  slept.tick(60_000, true)
  assert.equal(slept.snapshot().seconds, 2)
})

test('what was on screen gets its seconds', () => {
  const view = createView(0)
  for (let s = 1; s <= 16; s += 1) view.tick(s * 1000, true, [{ k: 'paywall', x: 'Guide paywall' }])
  assert.deepEqual(view.snapshot().events, [{ t: 0, k: 'paywall', x: 'Guide paywall', d: 16 }])
})

test('taps cannot crowd out a buying step', () => {
  const view = createView(0)
  for (let i = 0; i < 300; i += 1) view.add('tap', 'x')
  assert.ok(view.add('checkout'))
  assert.ok(view.snapshot().events.length <= 100)
})

test('a reader’s own details never become a label', () => {
  assert.equal(tapLabel('Jordan Example', false), 'Site menu')
  assert.equal(tapLabel('reader@example.com', true), 'A button')
  assert.equal(tapLabel('Become a member to unlock', true), 'Become a member to unlock')
  assert.equal(tapLabel('SUBSCRIBE', false), 'Subscribe')
  for (const path of ['/account/bookmarks', '/auth', '/auth-error', '/auth/reset-password', '/search', '/subscription/success']) {
    assert.equal(isOwnDetailsPage(path), true, path)
  }
  assert.equal(isOwnDetailsPage('/authors/questurian-editors'), false)
})

test('where a reader came from', () => {
  assert.equal(sourceOf('https://l.instagram.com/', '', 'www.questurian.com'), 'Instagram')
  assert.equal(sourceOf('', 'Mobile Instagram 410', 'www.questurian.com'), 'Instagram')
  assert.equal(sourceOf('https://notinstagram.com/', '', 'www.questurian.com'), 'notinstagram.com')
  assert.equal(sourceOf('http://localhost:3003/', '', 'www.questurian.com'), null)
  assert.equal(campaignOf('?utm_campaign=rooftop-reel'), 'rooftop-reel')
  assert.equal(campaignOf('?utm_campaign=me%40example.com'), null)
})

test('a visit ends after half an hour', () => {
  const visit = JSON.stringify({ id: 'a', last: 0, source: 'Direct', campaign: null })
  const arrival = () => ({ source: 'Instagram', campaign: null })
  const store = storage({ 'questurian:journey:visit': visit })
  assert.equal(currentVisit(store, VISIT_GAP_MS - 1, () => 'b', arrival).id, 'a')
  assert.equal(currentVisit(store, VISIT_GAP_MS, () => 'b', arrival).id, 'b')
})

test('off happens first, and the id waits for the deletion', async () => {
  const store = storage({ 'questurian:journey:viewer': 'id' })
  assert.equal(await turnOff(store, async () => ({ ok: false })), false)
  assert.equal(isOff(store), true)
  assert.equal(store.getItem('questurian:journey:viewer'), 'id')
  assert.equal(await turnOff(store, async () => ({ ok: true })), true)
  assert.equal(store.getItem('questurian:journey:viewer'), null)
})
