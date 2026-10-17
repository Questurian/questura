import assert from 'node:assert/strict'
import test from 'node:test'
import { ADS_LIVE, adUnitForWidth } from './adUnits.ts'

test('banner is the 728x90 only where the slot has 728px for it', () => {
  assert.equal(adUnitForWidth('banner', 0), 'mobileBanner')
  // A reading column beside the rail on a laptop.
  assert.equal(adUnitForWidth('banner', 597), 'mobileBanner')
  assert.equal(adUnitForWidth('banner', 728), 'leaderboard')
})

test('rail is the 300x250 until 1024px, then the 160x600', () => {
  assert.equal(adUnitForWidth('rail', 768), 'rectangle')
  assert.equal(adUnitForWidth('rail', 1024), 'skyscraper')
  assert.equal(adUnitForWidth('rectangle', 1440), 'rectangle')
})

test('no network fills the slots on the live site', () => {
  assert.equal(ADS_LIVE, false)
})
