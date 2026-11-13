import assert from 'node:assert/strict'
import test from 'node:test'
import { usableStopNotes } from './itineraryStopNotes.ts'

test('keeps a full note, trims it and fills the default icon (ADR 0048)', () => {
  const [note] = usableStopNotes([
    {
      label: ' Before tomorrow ',
      title: 'Tomorrow starts at 4:15 AM',
      timelineLabel: 'The morning',
      timeline: [{ time: '4:15', text: 'Alarm.' }, { time: '', text: 'dropped' }],
      checklist: ['Buy the ticket.', '  '],
    },
  ])
  assert.equal(note.label, 'Before tomorrow')
  assert.equal(note.icon, 'info')
  assert.equal(note.timelineLabel, 'The morning')
  assert.deepEqual(note.timeline, [{ time: '4:15', text: 'Alarm.' }])
  assert.deepEqual(note.checklist, ['Buy the ticket.'])
})

test('drops notes the page cannot draw', () => {
  assert.equal(usableStopNotes(null), undefined)
  assert.equal(usableStopNotes([{ label: 'x' }, 'y']), undefined)
})

test('keeps a known inline kind and drops an unknown one', () => {
  const notes = usableStopNotes([
    { kind: 'entry', label: 'Getting in', title: 'Pay at the door, about S/30.' },
    { kind: 'poster', label: 'Good to know', title: 'Closed Mondays.' },
  ])
  assert.equal(notes[0].kind, 'entry')
  assert.equal(notes[1].kind, undefined)
})
