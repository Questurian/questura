import assert from 'node:assert/strict'
import test from 'node:test'
import { groupListicleItemsBySection } from './listicleSectionGroups.ts'

const runsOf = (sections) =>
  groupListicleItemsBySection(sections.map((section, id) => ({ id, section }))).map((run) => ({
    section: run.section,
    start: run.start,
    ids: run.items.map((item) => item.id),
  }))

test('a list with no sections is one run with no heading', () => {
  assert.deepEqual(runsOf([null, undefined, '', '   ']), [{ section: null, start: 0, ids: [0, 1, 2, 3] }])
})

test('neighbours sharing a section form one run, numbering carries on', () => {
  assert.deepEqual(runsOf(['The It List', 'The It List', 'After dark', 'After dark', 'After dark']), [
    { section: 'The It List', start: 0, ids: [0, 1] },
    { section: 'After dark', start: 2, ids: [2, 3, 4] },
  ])
})

test('names match ignoring case and outer spaces; the first spelling wins', () => {
  assert.deepEqual(runsOf(['After dark', ' after DARK ', 'After Dark']), [
    { section: 'After dark', start: 0, ids: [0, 1, 2] },
  ])
})

test('items without a section close the run before them', () => {
  assert.deepEqual(runsOf(['With a view', 'With a view', null]), [
    { section: 'With a view', start: 0, ids: [0, 1] },
    { section: null, start: 2, ids: [2] },
  ])
})

test('a section split by other items keeps its order and gets two runs', () => {
  assert.deepEqual(runsOf(['Late nights', 'Brunch', 'Late nights']).map((run) => run.section), [
    'Late nights',
    'Brunch',
    'Late nights',
  ])
})
