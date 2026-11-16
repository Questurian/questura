import assert from 'node:assert/strict'
import test from 'node:test'
import { groupListicleItemsBySection, listicleSectionAnchors } from './listicleSectionGroups.ts'

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

const anchorsOf = (sections) => listicleSectionAnchors(sections.map((section) => ({ section })))

test('section ids come from the names, accents and spaces made plain', () => {
  assert.deepEqual(anchorsOf(['Sunset', 'Sunset', 'After dark', 'Música en vivo', null, 'Salsa']), [
    { start: 0, id: 'sunset' },
    { start: 2, id: 'after-dark' },
    { start: 3, id: 'musica-en-vivo' },
    { start: 5, id: 'salsa' },
  ])
})

test('a name used for two runs gets a number; a name with nothing to slug uses its place', () => {
  assert.deepEqual(anchorsOf(['Sunset', 'Salsa', 'sunset', '¡¡', 'Sunset']), [
    { start: 0, id: 'sunset' },
    { start: 1, id: 'salsa' },
    { start: 2, id: 'sunset-2' },
    { start: 3, id: 'listicle-section-3' },
    { start: 4, id: 'sunset-3' },
  ])
})

test('the first places of a list get the same ids as the whole list', () => {
  const whole = anchorsOf(['Sunset', 'Sunset', 'Cocktails', 'After dark', 'Salsa'])
  const sample = anchorsOf(['Sunset', 'Sunset', 'Cocktails'])
  assert.deepEqual(sample, whole.slice(0, sample.length))
})
