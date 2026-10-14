import {
  EDITORIAL_FEATURE_DESCRIPTION_MAX,
  EDITORIAL_FEATURE_FLAGS,
  EDITORIAL_FEATURE_KICKER_MAX,
  EDITORIAL_FEATURE_THEMES,
  EDITORIAL_FEATURE_TITLE_MAX,
  editorialFeatureFlag,
  type EditorialFeatureFlag,
  type EditorialFeatureTheme,
} from './constants'

export type ParsedEditorialFeatureField<T> =
  | { ok: true; omit: true }
  | { ok: true; omit: false; value: T }
  | { ok: false; message: string }

function parseTextField(
  body: Record<string, unknown>,
  field: string,
  maxLength: number,
  singleParagraph = false,
): ParsedEditorialFeatureField<string | null> {
  if (!Object.prototype.hasOwnProperty.call(body, field)) return { ok: true, omit: true }
  const raw = body[field]
  if (raw !== null && typeof raw !== 'string') {
    return { ok: false, message: `${field} must be a string or null.` }
  }
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (singleParagraph && /[\r\n]/.test(value)) {
    return { ok: false, message: `${field} must be one paragraph.` }
  }
  if (value.length > maxLength) {
    return { ok: false, message: `${field} must be ${maxLength} characters or fewer.` }
  }
  return { ok: true, omit: false, value: value || null }
}
function parseRelationshipField(
  body: Record<string, unknown>,
  field: string,
): ParsedEditorialFeatureField<number | null> {
  if (!Object.prototype.hasOwnProperty.call(body, field)) return { ok: true, omit: true }
  const raw = body[field]
  if (raw === null) return { ok: true, omit: false, value: null }
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
  if (!Number.isInteger(value) || value <= 0) {
    return { ok: false, message: `${field} must be a positive numeric id or null.` }
  }
  return { ok: true, omit: false, value }
}

function parseFlagField(
  body: Record<string, unknown>,
): ParsedEditorialFeatureField<EditorialFeatureFlag | null> {
  if (!Object.prototype.hasOwnProperty.call(body, 'featureFlag')) return { ok: true, omit: true }
  const raw = body.featureFlag
  if (raw === null || raw === '') return { ok: true, omit: false, value: null }
  const value = editorialFeatureFlag(raw)
  if (!value) {
    const allowed = EDITORIAL_FEATURE_FLAGS.map((flag) => flag.value).join(', ')
    return { ok: false, message: `featureFlag must be one of ${allowed}, or null.` }
  }
  return { ok: true, omit: false, value }
}

function parseThemeField(
  body: Record<string, unknown>,
): ParsedEditorialFeatureField<EditorialFeatureTheme> {
  if (!Object.prototype.hasOwnProperty.call(body, 'featureTheme')) return { ok: true, omit: true }
  const raw = body.featureTheme
  if (!EDITORIAL_FEATURE_THEMES.includes(raw as EditorialFeatureTheme)) {
    return { ok: false, message: `featureTheme must be one of ${EDITORIAL_FEATURE_THEMES.join(', ')}.` }
  }
  return { ok: true, omit: false, value: raw as EditorialFeatureTheme }
}

export function parseEditorialFeatureFields(body: Record<string, unknown>) {
  return {
    featureKicker: parseTextField(body, 'featureKicker', EDITORIAL_FEATURE_KICKER_MAX),
    featureTitle: parseTextField(body, 'featureTitle', EDITORIAL_FEATURE_TITLE_MAX),
    featureDescription: parseTextField(
      body,
      'featureDescription',
      EDITORIAL_FEATURE_DESCRIPTION_MAX,
      true,
    ),
    featureMediaSet: parseRelationshipField(body, 'featureMediaSet'),
    linkedLocation: parseRelationshipField(body, 'linkedLocation'),
    featureFlag: parseFlagField(body),
    featureTheme: parseThemeField(body),
  }
}

export function hasEditorialFeatureFieldUpdates(
  fields: ReturnType<typeof parseEditorialFeatureFields>,
): boolean {
  return Object.values(fields).some((field) => field.ok && !field.omit)
}
