import assert from 'node:assert/strict'
import test from 'node:test'
import { adStepWidth, adUnitForWidth, isAdShapeLive, isValidAdKey } from './adUnits.ts'

const KEY = 'a'.repeat(32)
const none = { leaderboard: '', mobileBanner: '', rectangle: '', skyscraper: '' }
const all = { leaderboard: KEY, mobileBanner: KEY, rectangle: KEY, skyscraper: KEY }

test('banner is the 728x90 only where the slot has 728px for it', () => {
  assert.equal(adUnitForWidth('banner', 0, all).name, 'mobileBanner')
  // A reading column beside the rail on a laptop.
  assert.equal(adUnitForWidth('banner', 597, all).name, 'mobileBanner')
  assert.equal(adStepWidth('banner', 727), 0)
  assert.equal(adStepWidth('banner', 900), 728)
  assert.deepEqual(adUnitForWidth('banner', 728, all), {
    name: 'leaderboard',
    key: KEY,
    width: 728,
    height: 90,
  })
})

test('rail is the 300x250 until 1024px, then the 160x600', () => {
  assert.equal(adUnitForWidth('rail', 768, all).name, 'rectangle')
  assert.equal(adUnitForWidth('rail', 1024, all).name, 'skyscraper')
  assert.equal(adUnitForWidth('rectangle', 1440, all).name, 'rectangle')
})

test('a shape is live only when every unit it uses has a key', () => {
  assert.equal(isAdShapeLive('banner', none), false)
  // Half a banner would leave phones with a gap.
  assert.equal(isAdShapeLive('banner', { ...none, leaderboard: KEY }), false)
  assert.equal(isAdShapeLive('banner', { ...none, leaderboard: KEY, mobileBanner: KEY }), true)
  assert.equal(isAdShapeLive('rectangle', { ...none, rectangle: KEY }), true)
  assert.equal(isAdShapeLive('rail', { ...none, rectangle: KEY }), false)
})

test('a pasted snippet or a placeholder is not a key', () => {
  assert.equal(isValidAdKey(KEY), true)
  assert.equal(isValidAdKey(''), false)
  assert.equal(isValidAdKey('YOUR_AD_KEY_HERE'), false)
  assert.equal(isValidAdKey(`${KEY}"></script>`), false)
})
