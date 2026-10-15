import { PHOTO_PILE_MAX_PHOTOS } from './block'

type ParsedPhotoPileField<T> =
  { ok: true; omit: true } | { ok: true; omit: false; value: T } | { ok: false; message: string }

function parseMediaSetIds(
  body: Record<string, unknown>,
  field: string,
): ParsedPhotoPileField<number[]> {
  if (!Object.prototype.hasOwnProperty.call(body, field)) return { ok: true, omit: true }
  const raw = body[field]
  if (raw === null) return { ok: true, omit: false, value: [] }
  if (!Array.isArray(raw)) return { ok: false, message: `${field} must be an array of media set ids.` }

  const ids = raw.map((value) =>
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN,
  )
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    return { ok: false, message: `${field} must hold positive numeric ids.` }
  }
  if (new Set(ids).size !== ids.length) {
    return { ok: false, message: `${field} lists the same photo twice.` }
  }
  if (ids.length > PHOTO_PILE_MAX_PHOTOS) {
    return { ok: false, message: `${field} holds at most ${PHOTO_PILE_MAX_PHOTOS} photos.` }
  }
  return { ok: true, omit: false, value: ids }
}

export function parsePhotoPileFields(body: Record<string, unknown>) {
  return {
    photoMediaSets: parseMediaSetIds(body, 'photoMediaSets'),
  }
}

export function hasPhotoPileFieldUpdates(fields: ReturnType<typeof parsePhotoPileFields>): boolean {
  return Object.values(fields).some((field) => field.ok && !field.omit)
}
