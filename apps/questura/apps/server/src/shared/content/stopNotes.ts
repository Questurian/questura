import type { Field } from 'payload'

/**
 * Stop Notes (studio ADR 0048): a labelled box of practical information on one
 * itinerary stop -- "Before tomorrow" under the last dinner of a day, "Getting
 * home tonight", "Book ahead". The site draws each one inside the stop's
 * entry, after the stop and its add-ons, in the same paper box as the Optional
 * add-on (client `ItineraryStopNote.tsx`). A note is not a stop: it has no
 * number, pin, photos or tours.
 *
 * Stored as one JSON value per stop, written by the AI Blog Writer, so adding
 * the field needs no new tables. The shape is checked on every save.
 */
export const STOP_NOTE_ICONS = ['clock', 'info', 'ticket', 'alert'] as const
export type StopNoteIcon = (typeof STOP_NOTE_ICONS)[number]

/**
 * A note with a kind is an inline note: one short line drawn inside the stop's
 * text ("What to order: ...", "Getting in: ...") instead of a box under the
 * stop. dish, drink and tip are offered on food and drink stops; entry and tip
 * on attractions. Matches the client's `INLINE_NOTE_KINDS`.
 */
export const INLINE_NOTE_KINDS = ['dish', 'tip', 'drink', 'entry'] as const
export type InlineNoteKind = (typeof INLINE_NOTE_KINDS)[number]

export type StopNote = {
  id?: string
  /** Set on an inline note; absent on a boxed note. */
  kind?: InlineNoteKind
  /** The short blue kicker: "Before tomorrow". */
  label: string
  icon?: StopNoteIcon
  /** One line: "Tomorrow starts at 4:15 AM". */
  title: string
  /** One short line under the title. */
  subline?: string
  /** Paragraphs, separated by a blank line; inline markdown (bold, links). */
  body?: string
  /** Small heading over the clock list: "The morning". */
  timelineLabel?: string
  /** Rows drawn as a clock list. */
  timeline?: Array<{ time: string; text: string }>
  /** Small heading over the checklist: "Do tonight". */
  checklistLabel?: string
  /** Lines drawn with a square box each. */
  checklist?: string[]
}

export const STOP_NOTE_LIMITS = {
  notesPerStop: 3,
  label: 40,
  title: 120,
  listLabel: 40,
  subline: 120,
  body: 2000,
  time: 12,
  rowText: 240,
  rows: 12,
} as const

const isText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max

const isOptionalText = (value: unknown, max: number): boolean =>
  value === undefined || value === null || value === '' || (typeof value === 'string' && value.length <= max)

/** Why one note is unusable, or null when it is fine. */
function noteProblem(value: unknown, position: number): string | null {
  const where = `Note ${position}`
  if (!value || typeof value !== 'object' || Array.isArray(value)) return `${where} is not a note`
  const note = value as Record<string, unknown>
  const L = STOP_NOTE_LIMITS
  if (!isText(note.label, L.label)) return `${where} needs a label of up to ${L.label} characters`
  if (!isText(note.title, L.title)) return `${where} needs a title of up to ${L.title} characters`
  if (!isOptionalText(note.subline, L.subline)) return `${where}: the subline is longer than ${L.subline} characters`
  if (!isOptionalText(note.body, L.body)) return `${where}: the text is longer than ${L.body} characters`
  if (!isOptionalText(note.timelineLabel, L.listLabel) || !isOptionalText(note.checklistLabel, L.listLabel)) {
    return `${where}: list headings are up to ${L.listLabel} characters`
  }
  if (note.kind !== undefined && note.kind !== null && !INLINE_NOTE_KINDS.includes(note.kind as InlineNoteKind)) {
    return `${where}: the kind must be one of ${INLINE_NOTE_KINDS.join(', ')}`
  }
  if (note.icon !== undefined && note.icon !== null && !STOP_NOTE_ICONS.includes(note.icon as StopNoteIcon)) {
    return `${where}: the icon must be one of ${STOP_NOTE_ICONS.join(', ')}`
  }
  if (note.timeline !== undefined && note.timeline !== null) {
    if (!Array.isArray(note.timeline) || note.timeline.length > L.rows) return `${where}: the timeline holds up to ${L.rows} rows`
    for (const row of note.timeline) {
      const r = (row ?? {}) as Record<string, unknown>
      if (!isText(r.time, L.time) || !isText(r.text, L.rowText)) {
        return `${where}: every timeline row needs a time and a line of text`
      }
    }
  }
  if (note.checklist !== undefined && note.checklist !== null) {
    if (!Array.isArray(note.checklist) || note.checklist.length > L.rows) return `${where}: the checklist holds up to ${L.rows} lines`
    if (!note.checklist.every((line) => isText(line, L.rowText))) return `${where}: every checklist line needs text`
  }
  return null
}

/** Null when the value is empty or a usable list of notes; otherwise what is wrong. */
export function stopNotesProblem(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (!Array.isArray(value)) return 'Stop notes must be a list'
  if (value.length > STOP_NOTE_LIMITS.notesPerStop) return `A stop holds up to ${STOP_NOTE_LIMITS.notesPerStop} notes`
  for (let index = 0; index < value.length; index += 1) {
    const problem = noteProblem(value[index], index + 1)
    if (problem) return problem
  }
  return null
}

export const stopNotesField: Field = {
  name: 'stopNotes',
  label: 'Stop notes',
  type: 'json',
  validate: (value: unknown) => stopNotesProblem(value) ?? true,
  admin: {
    readOnly: true,
    description:
      'Practical notes drawn under this stop ("Before tomorrow", "Book ahead"). Written in the AI Blog Writer.',
  },
}
