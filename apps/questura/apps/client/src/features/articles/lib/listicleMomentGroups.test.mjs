import assert from 'node:assert/strict'
import test from 'node:test'
import { groupListicleItemsByMoment } from './listicleMomentGroups.ts'

const runsOf = (moments) =>
  groupListicleItemsByMoment(moments.map((moment, id) => ({ id, moment }))).map((run) => ({
    moment: run.moment,
    start: run.start,
    ids: run.items.map((item) => item.id),
  }))

test('a list with no moments is one run with no heading', () => {
  assert.deepEqual(runsOf([null, undefined, '']), [{ moment: null, start: 0, ids: [0, 1, 2] }])
})

test('neighbours sharing a moment form one run, numbering carries on', () => {
  assert.deepEqual(runsOf(['fine-dining', 'fine-dining', 'on-a-budget', 'on-a-budget', 'on-a-budget']), [
    { moment: 'fine-dining', start: 0, ids: [0, 1] },
    { moment: 'on-a-budget', start: 2, ids: [2, 3, 4] },
  ])
})

test('items without a moment close the run before them', () => {
  assert.deepEqual(runsOf(['rooftop', 'rooftop', null]), [
    { moment: 'rooftop', start: 0, ids: [0, 1] },
    { moment: null, start: 2, ids: [2] },
  ])
})

test('a moment split by other items keeps its order and gets two runs', () => {
  assert.deepEqual(runsOf(['live-bands', 'karaoke', 'live-bands']).map((run) => run.moment), [
    'live-bands',
    'karaoke',
    'live-bands',
  ])
})
