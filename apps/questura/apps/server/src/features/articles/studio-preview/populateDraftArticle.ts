import type { CollectionSlug, Payload } from 'payload'

/**
 * Fills in an unsaved itinerary or listicle so the public serializer and the
 * site's page can read it: the AI Blog Writer holds bare ids, the page wants the records.
 *
 * The depth matches the public article routes (depth 2 on the article, so each
 * related record here is read at depth 1). A stop whose record is gone keeps
 * its bare id, and the page already leaves such a stop out.
 */

const STOP_ITEM_COLLECTIONS: Record<string, CollectionSlug> = {
  'itinerary-dining': 'dining',
  'itinerary-accommodations': 'accommodations',
  'itinerary-where-staying': 'accommodations',
  'itinerary-attractions': 'attractions',
  'itinerary-nightlife': 'nightlife',
  'itinerary-key-location': 'key-locations',
  'data-dining': 'dining',
  'data-accommodations': 'accommodations',
  'data-attractions': 'attractions',
  'data-nightlife': 'nightlife',
}

type Id = number | string
type Row = Record<string, unknown>
type Assign = (records: Map<CollectionSlug, Map<Id, unknown>>) => void

const isId = (value: unknown): value is Id =>
  typeof value === 'number' || (typeof value === 'string' && value !== '')

const isRow = (value: unknown): value is Row => typeof value === 'object' && value !== null

export async function populateDraftArticle(doc: Row, payload: Payload): Promise<Row> {
  const wanted = new Map<CollectionSlug, Set<Id>>()
  const assigns: Assign[] = []

  function want(collection: CollectionSlug, id: Id) {
    const ids = wanted.get(collection) ?? new Set<Id>()
    ids.add(id)
    wanted.set(collection, ids)
  }

  function one(row: Row, field: string, collection: CollectionSlug) {
    const id = row[field]
    if (!isId(id)) return
    want(collection, id)
    assigns.push((records) => {
      row[field] = records.get(collection)?.get(id) ?? id
    })
  }

  function many(row: Row, field: string, collection: CollectionSlug) {
    const ids = row[field]
    if (!Array.isArray(ids)) return
    const usable = ids.filter(isId)
    usable.forEach((id) => want(collection, id))
    assigns.push((records) => {
      row[field] = usable.map((id) => records.get(collection)?.get(id) ?? id)
    })
  }

  function stop(block: Row) {
    const itemCollection = STOP_ITEM_COLLECTIONS[String(block.blockType)]
    if (itemCollection) one(block, 'item', itemCollection)
    many(block, 'selectedPhotos', 'media-sets')
    one(block, 'selectedInstagramPost', 'instagram-posts')
    many(block, 'tours', 'tours')
    one(block, 'image', 'media-assets')
    one(block, 'instagramPost', 'instagram-posts')

    if (!Array.isArray(block.keyLocations)) return
    for (const row of block.keyLocations) {
      const related = isRow(row) ? row.relatedItem : null
      if (!isRow(related) || typeof related.relationTo !== 'string') continue
      one(related, 'value', related.relationTo as CollectionSlug)
    }
  }

  one(doc, 'author', 'authors')
  if (isRow(doc.header)) {
    one(doc.header, 'featuredMediaSet', 'media-sets')
    one(doc.header, 'featuredImage', 'media-assets')
  }
  if (Array.isArray(doc.items)) doc.items.filter(isRow).forEach(stop)
  if (Array.isArray(doc.itineraryDays)) {
    for (const day of doc.itineraryDays) {
      if (!isRow(day)) continue
      for (const key of ['whereStaying', 'items']) {
        const blocks = day[key]
        if (Array.isArray(blocks)) blocks.filter(isRow).forEach(stop)
      }
    }
  }

  const fetched = await Promise.all(
    [...wanted].map(async ([collection, ids]) => {
      const result = await payload.find({
        collection,
        where: { id: { in: [...ids] } },
        depth: 1,
        limit: ids.size,
        pagination: false,
        overrideAccess: true,
      })
      const byId = new Map<Id, unknown>(result.docs.map((record) => [record.id, record]))
      return [collection, byId] as const
    }),
  )

  const records = new Map(fetched)
  assigns.forEach((assign) => assign(records))
  return doc
}
