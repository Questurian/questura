import { describe, expect, it } from 'vitest'
import { stopNotesProblem } from './stopNotes'

const note = {
  label: 'Before tomorrow',
  icon: 'clock',
  title: 'Tomorrow starts at 4:15 AM',
  subline: 'Day 3 · Paracas and Huacachina',
  body: 'Keep tonight short.',
  timeline: [{ time: '4:15', text: 'Alarm.' }],
  checklist: ['Buy the 05:15 ticket.'],
}

describe('stop notes (ADR 0048)', () => {
  it('accepts no notes and a full note', () => {
    expect(stopNotesProblem(null)).toBeNull()
    expect(stopNotesProblem(undefined)).toBeNull()
    expect(stopNotesProblem([])).toBeNull()
    expect(stopNotesProblem([note])).toBeNull()
    expect(stopNotesProblem([{ label: 'Good to know', title: 'Cash only' }])).toBeNull()
  })

  it('refuses a note without a label or title', () => {
    expect(stopNotesProblem([{ ...note, label: ' ' }])).toMatch(/label/)
    expect(stopNotesProblem([{ ...note, title: '' }])).toMatch(/title/)
  })

  it('refuses an unknown icon and half-filled rows', () => {
    expect(stopNotesProblem([{ ...note, icon: 'rocket' }])).toMatch(/icon/)
    expect(stopNotesProblem([{ ...note, timeline: [{ time: '4:15', text: '' }] }])).toMatch(/timeline/)
    expect(stopNotesProblem([{ ...note, checklist: ['ok', ''] }])).toMatch(/checklist/)
  })

  it('caps the notes on one stop', () => {
    expect(stopNotesProblem([note, note, note])).toBeNull()
    expect(stopNotesProblem([note, note, note, note])).toMatch(/up to 3/)
    expect(stopNotesProblem({ label: 'x' })).toMatch(/list/)
  })
})
