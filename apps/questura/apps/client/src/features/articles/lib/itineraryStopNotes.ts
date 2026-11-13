import type { ItineraryStopNote } from '@/features/articles/types/itineraryListicle'

const ICONS = new Set(['clock', 'info', 'ticket', 'alert'])

/**
 * Inline notes: a note with a `kind` is one short line inside the stop's text
 * ("What to order:", "Getting in:") rather than a box under the stop. Matches
 * the server's `INLINE_NOTE_KINDS` and the AI Blog Writer's note kinds.
 */
export const INLINE_NOTE_KINDS = ['dish', 'tip', 'drink', 'entry'] as const
const KINDS = new Set<string>(INLINE_NOTE_KINDS)

const text = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : ''

/**
 * The stop's notes as the page can draw them (ADR 0048). The server checks the
 * shape on save; this only drops what cannot be shown (a note without a label
 * or title, empty rows) so an odd value never breaks a stop.
 */
export function usableStopNotes(value: unknown): ItineraryStopNote[] | undefined {
  if (!Array.isArray(value)) return undefined
  const notes = value
    .map((raw, index): ItineraryStopNote | null => {
      if (!raw || typeof raw !== 'object') return null
      const note = raw as Record<string, unknown>
      const label = text(note.label)
      const title = text(note.title)
      if (!label || !title) return null
      const timeline = Array.isArray(note.timeline)
        ? note.timeline
            .map((row) => {
              const r = (row ?? {}) as Record<string, unknown>
              return { time: text(r.time), text: text(r.text) }
            })
            .filter((row) => row.time && row.text)
        : []
      const checklist = Array.isArray(note.checklist)
        ? note.checklist.map(text).filter(Boolean)
        : []
      const icon = typeof note.icon === 'string' && ICONS.has(note.icon)
        ? (note.icon as ItineraryStopNote['icon'])
        : 'info'
      return {
        id: text(note.id) || `note-${index}`,
        ...(typeof note.kind === 'string' && KINDS.has(note.kind)
          ? { kind: note.kind as ItineraryStopNote['kind'] }
          : {}),
        label,
        icon,
        title,
        subline: text(note.subline) || undefined,
        body: text(note.body) || undefined,
        timelineLabel: text(note.timelineLabel) || undefined,
        timeline: timeline.length ? timeline : undefined,
        checklistLabel: text(note.checklistLabel) || undefined,
        checklist: checklist.length ? checklist : undefined,
      }
    })
    .filter((note): note is ItineraryStopNote => Boolean(note))
  return notes.length ? notes : undefined
}
