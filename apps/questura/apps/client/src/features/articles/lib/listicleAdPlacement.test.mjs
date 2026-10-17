import assert from 'node:assert/strict'
import test from 'node:test'
import { MAX_LISTICLE_ADS, planListicleAds } from './listicleAdPlacement.ts'

test('one ad after the intro, then one after every second entry', () => {
  const plan = planListicleAds(10)
  assert.equal(plan.afterIntro, true)
  assert.deepEqual([...plan.afterItem].sort((a, b) => a - b), [1, 3, 5, 7])
  assert.equal(plan.count, 5)
})

test('never after the last entry', () => {
  // Item 9 closes the list, so the slot that would follow it is dropped.
  assert.equal(planListicleAds(10).afterItem.has(9), false)
  // An odd count ends on a non-slot anyway.
  assert.equal(planListicleAds(11).afterItem.has(10), false)
})

test('no intro means no opening slot', () => {
  const plan = planListicleAds(6, { hasIntro: false })
  assert.equal(plan.afterIntro, false)
  assert.deepEqual([...plan.afterItem].sort((a, b) => a - b), [1, 3])
})

test('a one-entry list gets the intro slot and nothing between', () => {
  const plan = planListicleAds(1)
  assert.equal(plan.afterIntro, true)
  assert.equal(plan.afterItem.size, 0)
})

test('an empty list gets nothing', () => {
  assert.equal(planListicleAds(0).count, 0)
})

test('the cadence is a knob', () => {
  assert.deepEqual([...planListicleAds(12, { everyNItems: 3 }).afterItem], [2, 5, 8])
  assert.deepEqual([...planListicleAds(12, { everyNItems: 4 }).afterItem], [3, 7])
})

test('never more than six ads in a list, the intro slot included', () => {
  assert.equal(MAX_LISTICLE_ADS, 6)
  for (let items = 0; items <= 60; items += 1) {
    assert.ok(planListicleAds(items).count <= 6, `${items} entries`)
    assert.ok(planListicleAds(items, { hasIntro: false }).count <= 6, `${items} entries, no intro`)
  }
  // Twelve entries fit the normal cadence exactly: intro + 5.
  assert.equal(planListicleAds(12).count, 6)
})

test('a long list spreads its ads out instead of stopping halfway', () => {
  // 19 entries at every 2nd would be 10 ads; at every 4th it is intro + 4,
  // and the last one sits in the back half of the list.
  const plan = planListicleAds(19)
  assert.deepEqual([...plan.afterItem], [3, 7, 11, 15])
  assert.equal(plan.count, 5)
  const long = planListicleAds(60)
  assert.ok(Math.max(...long.afterItem) > 40, 'ads reach the end of a long list')
})

test('the ceiling is a knob; 0 removes it', () => {
  assert.equal(planListicleAds(19, { maxAds: 0 }).count, 10)
  assert.equal(planListicleAds(19, { maxAds: 1 }).count, 1)
  assert.equal(planListicleAds(19, { maxAds: 1 }).afterIntro, true)
})

test('disabled means no slots', () => {
  assert.equal(planListicleAds(20, { enabled: false }).count, 0)
})
