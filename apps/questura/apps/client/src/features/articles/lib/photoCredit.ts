import type { ImageAttributionData } from '@/features/articles/types'

/** Who the credit line names when a photo carries no credit of its own. */
export const HOUSE_CREDIT = 'Questurian'

/** One original photo behind a published image. */
export type PhotoSource = {
  /** Where it sits in a composite ("Top left"); null for a single photo. */
  position: string | null
  credit: string
  title: string | null
  /** The original's page, only when it is a plain http(s) link. */
  url: string | null
}

/** The sources of one published image. */
export type PhotoCreditGroup = {
  /** Which photo of a multi-photo block this is ("Left photo"); null for one photo. */
  heading: string | null
  sources: PhotoSource[]
  /** Who assembled a composite or edited a still, when someone did. */
  editCredit: string | null
}

/** What the credit line under a photo prints, and what its Source popover lists. */
export type PhotoCredit = {
  holder: string
  groups: PhotoCreditGroup[]
}

/** Anything carrying Payload's attribution fields: a media set, an asset, a resolved image. */
export type AttributionCarrier = ImageAttributionData | number | string | null | undefined

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null

function safeUrl(value: unknown): string | null {
  const raw = text(value)
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) return url.href
  } catch {
    // Not a web address: the credit is printed without a link.
  }
  return null
}

// Composites saved before per-photo sources existed hold their whole credit
// line in `photographer_credit`: "Photos: A, B · Composite / edit: Questurian".
const COMPOSED_EDIT = /\s*·\s*Composite \/ edit:\s*(.+)$/
const COMPOSED_PREFIX = /^Photos?:\s*/

/**
 * Reads the first carrier that has each field, in order. Pass the media set
 * before its asset: the server resolves credits the same way, and an asset's
 * own `photographer_credit` is often a copy made at upload.
 */
function groupFrom(carriers: AttributionCarrier[], heading: string | null): PhotoCreditGroup {
  const records = carriers.filter(
    (carrier): carrier is ImageAttributionData => typeof carrier === 'object' && carrier !== null,
  )
  const first = <T,>(read: (record: ImageAttributionData) => T | null): T | null => {
    for (const record of records) {
      const value = read(record)
      if (value !== null) return value
    }
    return null
  }

  let sources: PhotoSource[] =
    first((record) => {
      const rows = (Array.isArray(record.sources) ? record.sources : []).flatMap((row) => {
        const credit = text(row?.credit)
        return credit
          ? [{ position: text(row.position), credit, title: text(row.title), url: safeUrl(row.url) }]
          : []
      })
      return rows.length ? rows : null
    }) ?? []
  let editCredit = first((record) => text(record.edit_credit))

  if (!sources.length) {
    const photographer = first((record) => text(record.photographer_credit))
    const composedEdit = photographer ? COMPOSED_EDIT.exec(photographer) : null
    if (composedEdit) editCredit ??= text(composedEdit[1])
    const credit = photographer
      ? text(photographer.replace(COMPOSED_EDIT, '').replace(COMPOSED_PREFIX, ''))
      : null
    sources = [{ position: null, credit: credit ?? HOUSE_CREDIT, title: null, url: null }]
  }

  return { heading, sources, editCredit }
}

function holderOf(group: PhotoCreditGroup): string {
  if (group.editCredit) return group.editCredit
  const names = [...new Set(group.sources.map((source) => source.credit))]
  return names.length === 1 ? names[0] : HOUSE_CREDIT
}

/** The credit for one photo. */
export function photoCredit(...carriers: AttributionCarrier[]): PhotoCredit {
  const group = groupFrom(carriers, null)
  return { holder: holderOf(group), groups: [group] }
}

/** One credit line for a block of several photos; the popover lists each under its heading. */
export function blockPhotoCredit(
  photos: Array<{ heading: string; carriers: AttributionCarrier[] }>,
): PhotoCredit {
  const groups = photos.map(({ heading, carriers }) => groupFrom(carriers, heading))
  const holders = [...new Set(groups.map(holderOf))]
  return { holder: holders.join(', '), groups }
}
