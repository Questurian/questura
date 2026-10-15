import type { PayloadInstance } from '@/types'
import { resolveMediaSetForPlacement } from '@/features/media/lib/resolve-public-image'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function relationshipIds(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    const raw = isRecord(entry) ? entry.id : entry
    const id = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
    return Number.isInteger(id) && id > 0 ? [id] : []
  })
}

/**
 * The pile's photos in the editor's order, each at its wide (16:9) crop. A
 * deleted media set drops out of the list, which can leave too few to
 * publish; a failed read throws.
 */
export async function resolvePhotoPileFields(
  payload: PayloadInstance,
  block: Record<string, unknown>,
) {
  const photoMediaSetIds = relationshipIds(block.photoMediaSets)
  if (photoMediaSetIds.length === 0) return { photoMediaSetIds, pilePhotos: [] }

  const found = await payload.find({
    collection: 'media-sets',
    where: { id: { in: photoMediaSetIds } },
    depth: 1,
    limit: photoMediaSetIds.length,
    overrideAccess: true,
  })
  const byId = new Map(
    found.docs.map((doc) => [Number((doc as { id: unknown }).id), doc as unknown as Record<string, unknown>]),
  )
  const pilePhotos = photoMediaSetIds.flatMap((mediaSetId) => {
    const mediaSet = byId.get(mediaSetId)
    return mediaSet ? [{ mediaSetId, ...resolveMediaSetForPlacement(mediaSet, 'wide-card') }] : []
  })

  return { photoMediaSetIds, pilePhotos }
}
