import type { ImageAttributionData } from '@/features/articles/types'

/** Who a photo is credited to when it carries no credit of its own. */
export const HOUSE_CREDIT = 'Questurian'

/**
 * What the line under a photo prints. A plain photo has one credit, on the
 * right. A composite or edited still also names who made it, on the left;
 * when its originals come from more than one place, the right says "Sources"
 * and a small hover lists them.
 */
export type PhotoCredit = {
  /** Left side: who assembled a composite or edited a still. Null for a plain photo. */
  createdBy: string | null
  /** Right side, printed as is. Null when there are several sources. */
  credit: string | null
  /** The names behind "Sources": deduplicated, one entry per platform. */
  sources: string[]
}

/** Anything carrying Payload's attribution fields: a media set, an asset, a resolved image. */
export type AttributionCarrier = ImageAttributionData | number | string | null | undefined

type ImageCredit = { names: string[]; createdBy: string | null }

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null

const unique = (values: string[]): string[] => [...new Set(values)]

// Composites saved before per-photo sources existed hold their whole credit
// line in `photographer_credit`: "Photos: A, B · Composite / edit: Questurian".
const COMPOSED_EDIT = /\s*·\s*Composite \/ edit:\s*(.+)$/
const COMPOSED_PREFIX = /^Photos?:\s*/

// Listing photos are credited "Host / Platform" ("Alvaro / Airbnb").
const PLATFORM_CREDIT = /^.+?\s+\/\s+([^/]+)$/

/**
 * Reads the first carrier that has each field, in order. Pass the media set
 * before its asset: the server resolves credits the same way, and an asset's
 * own `photographer_credit` is often a copy made at upload.
 */
function imageCredit(carriers: AttributionCarrier[]): ImageCredit {
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

  const sources =
    first((record) => {
      const names = (Array.isArray(record.sources) ? record.sources : []).flatMap((row) => {
        const credit = text(row?.credit)
        return credit ? [credit] : []
      })
      return names.length ? names : null
    }) ?? []
  let editor = first((record) => text(record.edit_credit))

  if (!sources.length) {
    const photographer = first((record) => text(record.photographer_credit))
    const composedEdit = photographer ? COMPOSED_EDIT.exec(photographer) : null
    if (composedEdit) editor ??= text(composedEdit[1])
    const credit = photographer
      ? text(photographer.replace(COMPOSED_EDIT, '').replace(COMPOSED_PREFIX, ''))
      : null
    // A photo nobody credited is ours.
    sources.push(credit ?? HOUSE_CREDIT)
  }

  // Several originals in one image means someone put them together.
  const createdBy = editor ?? (sources.length > 1 ? HOUSE_CREDIT : null)
  return { names: unique(sources), createdBy }
}

function creditFor(images: ImageCredit[]): PhotoCredit {
  const creators = unique(images.flatMap((image) => (image.createdBy ? [image.createdBy] : [])))
  const createdBy = creators.length === 1 ? creators[0] : null
  const names = unique(images.flatMap((image) => image.names))

  if (names.length === 1) {
    // Our own photo, edited by us, needs our name once.
    return { createdBy: createdBy === names[0] ? null : createdBy, credit: names[0], sources: names }
  }

  // "Roxana / Airbnb" and "Ana / Airbnb" are both Airbnb.
  const collapsed = unique(names.map((name) => PLATFORM_CREDIT.exec(name)?.[1].trim() ?? name))
  if (collapsed.length === 1) {
    return { createdBy, credit: `Photos courtesy of ${collapsed[0]}`, sources: collapsed }
  }
  return { createdBy, credit: null, sources: collapsed }
}

/** The credit for one photo. */
export function photoCredit(...carriers: AttributionCarrier[]): PhotoCredit {
  return creditFor([imageCredit(carriers)])
}

/** One credit line for a block of several photos, each given as its carriers. */
export function blockPhotoCredit(photos: AttributionCarrier[][]): PhotoCredit {
  return creditFor(photos.map(imageCredit))
}
