import assert from 'node:assert/strict'
import test from 'node:test'

import { HOUSE_CREDIT, blockPhotoCredit, photoCredit } from './photoCredit.ts'

test('a four-photo composite credits its editor and lists every original in order', () => {
  const credit = photoCredit({
    edit_credit: 'Questurian',
    photographer_credit: 'Photos: Maria, Alex · Composite / edit: Questurian',
    sources: ['Top left', 'Top right', 'Bottom left', 'Bottom right'].map((position, index) => ({
      position,
      title: `Photo ${index + 1}`,
      credit: index < 2 ? 'Maria' : 'Alex',
      url: 'https://photos.example/original',
    })),
  })
  assert.equal(credit.holder, 'Questurian')
  assert.equal(credit.groups.length, 1)
  const [group] = credit.groups
  assert.equal(group.editCredit, 'Questurian')
  assert.deepEqual(
    group.sources.map((source) => source.position),
    ['Top left', 'Top right', 'Bottom left', 'Bottom right'],
  )
  assert.equal(group.sources[3].url, 'https://photos.example/original')
})

test('one photographer behind every source is the holder', () => {
  const credit = photoCredit({ sources: [{ position: 'Photo', credit: 'El Rey del Lomo' }] })
  assert.equal(credit.holder, 'El Rey del Lomo')
})

test('unsafe source links are dropped, the credit stays', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'https://secret@photos.example/x']) {
    const [source] = photoCredit({ sources: [{ position: 'Left', credit: 'Maria', url }] }).groups[0].sources
    assert.equal(source.credit, 'Maria')
    assert.equal(source.url, null)
  }
})

test('a plain photographer credit is the holder and the only source', () => {
  const credit = photoCredit({ photographer_credit: 'Alvaro / Airbnb', sources: [] })
  assert.equal(credit.holder, 'Alvaro / Airbnb')
  assert.deepEqual(credit.groups[0].sources, [
    { position: null, credit: 'Alvaro / Airbnb', title: null, url: null },
  ])
})

test('a composed credit line without sources is read as an editor plus a photographers line', () => {
  const credit = photoCredit({ photographer_credit: 'Photos: Wa Lok · Composite / edit: Questurian' })
  assert.equal(credit.holder, 'Questurian')
  assert.equal(credit.groups[0].editCredit, 'Questurian')
  assert.equal(credit.groups[0].sources[0].credit, 'Wa Lok')
})

test('the media set wins over its asset copy; an empty set falls through to the asset', () => {
  assert.equal(photoCredit({ photographer_credit: 'Set' }, { photographer_credit: 'Asset' }).holder, 'Set')
  assert.equal(photoCredit({ photographer_credit: null, sources: [] }, { photographer_credit: 'Asset' }).holder, 'Asset')
  assert.equal(photoCredit(370, { photographer_credit: 'Asset' }).holder, 'Asset')
})

test('a photo with no credit at all is credited to Questurian', () => {
  for (const carriers of [[], [null], [{}], [{ photographer_credit: '  ', sources: [] }]]) {
    const credit = photoCredit(...carriers)
    assert.equal(credit.holder, HOUSE_CREDIT)
    assert.equal(credit.groups[0].sources[0].credit, HOUSE_CREDIT)
  }
})

test('a photo pair names each holder once and lists each photo under its heading', () => {
  const credit = blockPhotoCredit([
    { heading: 'Left', carriers: [{ photographer_credit: 'Questurian' }] },
    { heading: 'Right', carriers: [{ photographer_credit: '27 Tapas' }] },
  ])
  assert.equal(credit.holder, 'Questurian, 27 Tapas')
  assert.deepEqual(credit.groups.map((group) => group.heading), ['Left', 'Right'])

  const same = blockPhotoCredit([
    { heading: 'Left', carriers: [{}] },
    { heading: 'Right', carriers: [{ photographer_credit: 'Questurian' }] },
  ])
  assert.equal(same.holder, 'Questurian')
})
