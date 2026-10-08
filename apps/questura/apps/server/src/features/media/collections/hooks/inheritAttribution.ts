import type { CollectionBeforeChangeHook } from 'payload'

/** Regenerated variants retain the parent set's canonical attribution snapshot. */
export const inheritAttribution: CollectionBeforeChangeHook = async ({ data, req, operation, originalDoc }) => {
  if (!data?.mediaSet || (operation !== 'create' && data.mediaSet === originalDoc?.mediaSet)) return data
  if (data.sources !== undefined && data.edit_credit !== undefined) return data
  const id = typeof data.mediaSet === 'object' ? data.mediaSet.id : data.mediaSet
  const parent = await req.payload.findByID({ collection: 'media-sets', id, depth: 0, overrideAccess: true, req })
  if (data.sources === undefined) data.sources = parent.sources?.map(({ id: _id, ...source }) => source) ?? []
  if (data.edit_credit === undefined) data.edit_credit = parent.edit_credit ?? null
  return data
}
