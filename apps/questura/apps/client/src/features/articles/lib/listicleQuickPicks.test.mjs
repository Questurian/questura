import assert from 'node:assert/strict'
import test from 'node:test'
import { listicleEntryAnchors, listicleQuickPicks } from './listicleQuickPicks.ts'

const row = (title, extra = {}) => ({ item: { title }, ...extra })

test('entry ids come from the name the entry shows', () => {
  assert.deepEqual(
    listicleEntryAnchors([row('Son de Cuba'), row('Damián'), row('x', { activityTitle: 'Paragliding' })]),
    ['son-de-cuba', 'damian', 'paragliding'],
  )
})

test('entry ids never repeat a section id or each other', () => {
  const rows = [row('Salsa', { section: 'Salsa' }), row('Bizarro'), row('Bizarro')]
  assert.deepEqual(listicleEntryAnchors(rows), ['salsa-2', 'bizarro', 'bizarro-2'])
})

test('a name with nothing to slug falls back to its position', () => {
  assert.deepEqual(listicleEntryAnchors([row('¡!'), row('')]), ['listicle-entry-1', 'listicle-entry-2'])
})

test('picks are the labelled places, in list order, with trimmed text', () => {
  const rows = [
    row('Bizarro', { pick: ' First night ', pickNote: 'Miraflores · Wed–Sat' }),
    row('Noise'),
    row('Son de Cuba', { pick: 'Salsa', pickNote: '  ' }),
    row('', { pick: 'Ghost' }),
  ]
  assert.deepEqual(listicleQuickPicks(rows), [
    { index: 0, label: 'First night', title: 'Bizarro', note: 'Miraflores · Wed–Sat', anchorId: 'bizarro' },
    { index: 2, label: 'Salsa', title: 'Son de Cuba', note: null, anchorId: 'son-de-cuba' },
  ])
})

test('a list without picks has none', () => {
  assert.deepEqual(listicleQuickPicks([row('Bizarro'), row('Noise', { pick: '' })]), [])
})
