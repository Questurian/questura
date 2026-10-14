import assert from 'node:assert/strict'
import test from 'node:test'

import { HOUSE_CREDIT, blockPhotoCredit, photoCredit } from './photoCredit.ts'

const sources = (...credits) => credits.map((credit, index) => ({ position: `Spot ${index}`, credit }))

test('a plain photo is credited to its photographer, on the right, with nothing on the left', () => {
  assert.deepEqual(photoCredit({ photographer_credit: 'Alvaro / Airbnb', sources: [] }), {
    createdBy: null,
    credit: 'Alvaro / Airbnb',
    sources: ['Alvaro / Airbnb'],
  })
})

test('a composite of one platform reads "Photos courtesy of" it, created by its editor', () => {
  const credit = photoCredit({
    edit_credit: 'Questurian',
    photographer_credit: 'Photos: Roxana / Airbnb, Ana / Airbnb · Composite / edit: Questurian',
    sources: sources('Roxana / Airbnb', 'Ana / Airbnb', 'Juan Manuel / Airbnb', 'Javier / Airbnb'),
  })
  assert.deepEqual(credit, { createdBy: 'Questurian', credit: 'Photos courtesy of Airbnb', sources: ['Airbnb'] })
})

test('a composite of mixed sources says "Sources" and lists each name once, no positions', () => {
  const credit = photoCredit({
    edit_credit: 'Questurian',
    sources: sources('Carlos Vargas', 'Canta Rana', 'Carlos Vargas', 'Questurian', 'Pedro / Airbnb', 'Ana / Airbnb'),
  })
  assert.equal(credit.createdBy, 'Questurian')
  assert.equal(credit.credit, null)
  assert.deepEqual(credit.sources, ['Carlos Vargas', 'Canta Rana', 'Questurian', 'Airbnb'])
})

test('one photographer behind every original is the credit, not "Sources"', () => {
  const credit = photoCredit({ edit_credit: 'Questurian', sources: sources('El Rey del Lomo', 'El Rey del Lomo') })
  assert.deepEqual(credit, { createdBy: 'Questurian', credit: 'El Rey del Lomo', sources: ['El Rey del Lomo'] })
})

test('several originals with no editor were still put together by Questurian', () => {
  assert.equal(photoCredit({ sources: sources('A', 'B') }).createdBy, HOUSE_CREDIT)
})

test('our own photo, edited by us, names us once', () => {
  assert.deepEqual(photoCredit({ photographer_credit: 'Questurian', edit_credit: 'Questurian' }), {
    createdBy: null,
    credit: 'Questurian',
    sources: ['Questurian'],
  })
})

test('a composed credit line without sources is read as its editor plus a photographers line', () => {
  const credit = photoCredit({ photographer_credit: 'Photos: Wa Lok · Composite / edit: Questurian' })
  assert.deepEqual(credit, { createdBy: 'Questurian', credit: 'Wa Lok', sources: ['Wa Lok'] })
})

test('the media set wins over its asset copy; an empty set falls through to the asset', () => {
  assert.equal(photoCredit({ photographer_credit: 'Set' }, { photographer_credit: 'Asset' }).credit, 'Set')
  assert.equal(photoCredit({ photographer_credit: null, sources: [] }, { photographer_credit: 'Asset' }).credit, 'Asset')
  assert.equal(photoCredit(370, { photographer_credit: 'Asset' }).credit, 'Asset')
})

test('a photo with no credit at all is credited to Questurian', () => {
  for (const carriers of [[], [null], [{}], [{ photographer_credit: '  ', sources: [] }]]) {
    assert.deepEqual(photoCredit(...carriers), { createdBy: null, credit: HOUSE_CREDIT, sources: [HOUSE_CREDIT] })
  }
})

test('a photo pair by one photographer shows one credit; by two, "Sources"', () => {
  const same = blockPhotoCredit([[{}], [{ photographer_credit: 'Questurian' }]])
  assert.deepEqual(same, { createdBy: null, credit: 'Questurian', sources: ['Questurian'] })

  const mixed = blockPhotoCredit([[{ photographer_credit: 'Questurian' }], [{ photographer_credit: '27 Tapas' }]])
  assert.deepEqual(mixed, { createdBy: null, credit: null, sources: ['Questurian', '27 Tapas'] })

  // An uncredited photo is ours, not the other photographer's.
  const uncredited = blockPhotoCredit([[{}], [{ photographer_credit: '27 Tapas' }]])
  assert.deepEqual(uncredited.sources, ['Questurian', '27 Tapas'])
})
