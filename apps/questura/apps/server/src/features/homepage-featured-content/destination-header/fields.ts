import {
  DESTINATION_HEADER_DESCRIPTION_MAX,
  DESTINATION_HEADER_LAYOUTS,
  type DestinationHeaderLayout,
} from './constants'

type ParsedDestinationHeaderField<T> =
  | { ok: true; omit: true }
  | { ok: true; omit: false; value: T }
  | { ok: false; message: string }

function parseMediaSetField(
  body: Record<string, unknown>,
  field: string,
): ParsedDestinationHeaderField<number | null> {
  if (!Object.prototype.hasOwnProperty.call(body, field)) return { ok: true, omit: true }
  const raw = body[field]
  if (raw === null) return { ok: true, omit: false, value: null }
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
  if (!Number.isInteger(value) || value <= 0) {
    return { ok: false, message: `${field} must be a positive numeric id or null.` }
  }
  return { ok: true, omit: false, value }
}

/** Trims the text and collapses runs of blank lines to one paragraph break. */
export function normalizeDestinationDescription(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n')
}

function parseDescriptionField(
  body: Record<string, unknown>,
  field: string,
): ParsedDestinationHeaderField<string | null> {
  if (!Object.prototype.hasOwnProperty.call(body, field)) return { ok: true, omit: true }
  const raw = body[field]
  if (raw !== null && typeof raw !== 'string') {
    return { ok: false, message: `${field} must be a string or null.` }
  }
  const value = typeof raw === 'string' ? normalizeDestinationDescription(raw) : ''
  if (value.length > DESTINATION_HEADER_DESCRIPTION_MAX) {
    return {
      ok: false,
      message: `${field} must be ${DESTINATION_HEADER_DESCRIPTION_MAX} characters or fewer.`,
    }
  }
  return { ok: true, omit: false, value: value || null }
}

function parseLayoutField(
  body: Record<string, unknown>,
  field: string,
): ParsedDestinationHeaderField<DestinationHeaderLayout> {
  if (!Object.prototype.hasOwnProperty.call(body, field)) return { ok: true, omit: true }
  const raw = body[field]
  if (!DESTINATION_HEADER_LAYOUTS.includes(raw as DestinationHeaderLayout)) {
    return { ok: false, message: `${field} must be one of ${DESTINATION_HEADER_LAYOUTS.join(', ')}.` }
  }
  return { ok: true, omit: false, value: raw as DestinationHeaderLayout }
}

function parseFocusField(
  body: Record<string, unknown>,
  field: string,
): ParsedDestinationHeaderField<number> {
  if (!Object.prototype.hasOwnProperty.call(body, field)) return { ok: true, omit: true }
  const raw = body[field]
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0 || raw > 100) {
    return { ok: false, message: `${field} must be a number from 0 to 100.` }
  }
  return { ok: true, omit: false, value: Math.round(raw * 10) / 10 }
}

export function parseDestinationHeaderFields(body: Record<string, unknown>) {
  return {
    destinationMediaSet: parseMediaSetField(body, 'destinationMediaSet'),
    destinationDescription: parseDescriptionField(body, 'destinationDescription'),
    destinationLayout: parseLayoutField(body, 'destinationLayout'),
    destinationFocusX: parseFocusField(body, 'destinationFocusX'),
    destinationFocusY: parseFocusField(body, 'destinationFocusY'),
  }
}

export function hasDestinationHeaderFieldUpdates(
  fields: ReturnType<typeof parseDestinationHeaderFields>,
): boolean {
  return Object.values(fields).some((field) => field.ok && !field.omit)
}
