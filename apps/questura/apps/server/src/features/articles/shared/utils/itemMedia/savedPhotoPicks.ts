import { getSourceCollectionForBlockType } from './sourceItems'
import { normalizeRelationshipId, normalizeRelationshipIds, relationshipIdToKey } from './relationshipIds'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Photo picks already saved on a guide, keyed by `${sourceCollection}:${sourceItemId}`. */
export type SavedPhotoPicks = Map<string, Set<string>>

export const savedPhotoPickKey = (sourceCollection: string, sourceItemId: string | number): string =>
  `${sourceCollection}:${relationshipIdToKey(sourceItemId)}`

/**
 * Collects the photos each place already had picked on the stored guide.
 *
 * A Location Manager sync can drop a photo from a place's gallery (the gallery
 * holds at most 20) while a guide still shows it. The gallery rule exists so a
 * new pick comes from that place; a photo already saved on the same place
 * stays allowed, or every later save of the guide (a map picture, a typo fix)
 * is refused for a pick nobody touched.
 */
export const collectSavedPhotoPicks = (rows: unknown[]): SavedPhotoPicks => {
  const picks: SavedPhotoPicks = new Map()

  for (const row of rows) {
    if (!isRecord(row)) continue
    const sourceCollection = getSourceCollectionForBlockType(row.blockType)
    const sourceItemId = normalizeRelationshipId(row.item)
    if (!sourceCollection || sourceItemId === null) continue

    const key = savedPhotoPickKey(sourceCollection, sourceItemId)
    const set = picks.get(key) ?? new Set<string>()
    for (const photoId of normalizeRelationshipIds(row.selectedPhotos)) {
      set.add(relationshipIdToKey(photoId))
    }
    picks.set(key, set)
  }

  return picks
}

/** True when this photo was already saved for this place on the stored guide. */
export const isSavedPhotoPick = (
  picks: SavedPhotoPicks | undefined,
  sourceCollection: string,
  sourceItemId: string | number,
  photoId: string | number,
): boolean =>
  picks?.get(savedPhotoPickKey(sourceCollection, sourceItemId))?.has(relationshipIdToKey(photoId)) ?? false
