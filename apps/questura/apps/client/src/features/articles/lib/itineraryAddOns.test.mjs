import assert from 'node:assert/strict'
import test from 'node:test'
import { groupItineraryStops, isActivityAddOn } from './itineraryAddOns.ts'

const stop = (id, item, extra = {}) => ({ id, blockType: 'itinerary-attractions', item: { id: item, title: `place ${item}` }, ...extra })

test('an activity on the same place as the stop above is its add-on', () => {
  const groups = groupItineraryStops([
    stop('lighthouse', 13),
    stop('love-park', 17),
    stop('paragliding', 17, { activityTitle: 'Paragliding over the Costa Verde' }),
    stop('cremoladas', 572),
  ])

  assert.deepEqual(groups.map((group) => group.block.id), ['lighthouse', 'love-park', 'cremoladas'])
  assert.deepEqual(groups[1].addOns.map((addOn) => [addOn.block.id, addOn.index]), [['paragliding', 2]])
  assert.equal(groups[2].index, 3)
})

test('an activity on its own place stays a stop', () => {
  const groups = groupItineraryStops([stop('lighthouse', 13), stop('raimondi', 82, { activityTitle: 'Paragliding' })])

  assert.equal(groups.length, 2)
  assert.deepEqual(groups[1].addOns, [])
})

test('the same place twice without an activity title is two stops', () => {
  assert.equal(isActivityAddOn(stop('b', 17), stop('a', 17)), false)
  assert.equal(isActivityAddOn(stop('b', 17, { activityTitle: '  ' }), stop('a', 17)), false)
})

test('several add-ons in a row all belong to the place above', () => {
  const groups = groupItineraryStops([
    stop('beach', 5),
    stop('surf', 5, { activityTitle: 'Surf lesson' }),
    stop('kayak', 5, { activityTitle: 'Kayak' }),
  ])

  assert.equal(groups.length, 1)
  assert.deepEqual(groups[0].addOns.map((addOn) => addOn.block.id), ['surf', 'kayak'])
})

test('an add-on matches a place given as a bare id or as a populated item', () => {
  assert.equal(isActivityAddOn({ ...stop('b', 17, { activityTitle: 'x' }), item: 17 }, stop('a', 17)), true)
})

test('a tour-agency block never has add-ons', () => {
  assert.equal(isActivityAddOn(stop('b', 17, { activityTitle: 'x' }), { blockType: 'itinerary-tour-agency' }), false)
})
