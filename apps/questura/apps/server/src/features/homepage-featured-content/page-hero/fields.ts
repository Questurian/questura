type ParsedPageHeroField<T> =
  { ok: true; omit: true } | { ok: true; omit: false; value: T } | { ok: false; message: string }

function parseMediaSetField(
  body: Record<string, unknown>,
  field: string,
): ParsedPageHeroField<number | null> {
  if (!Object.prototype.hasOwnProperty.call(body, field)) return { ok: true, omit: true }
  const raw = body[field]
  if (raw === null) return { ok: true, omit: false, value: null }
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
  if (!Number.isInteger(value) || value <= 0) {
    return { ok: false, message: `${field} must be a positive numeric id or null.` }
  }
  return { ok: true, omit: false, value }
}

export function parsePageHeroFields(body: Record<string, unknown>) {
  return {
    heroMediaSet: parseMediaSetField(body, 'heroMediaSet'),
  }
}

export function hasPageHeroFieldUpdates(fields: ReturnType<typeof parsePageHeroFields>): boolean {
  return Object.values(fields).some((field) => field.ok && !field.omit)
}
