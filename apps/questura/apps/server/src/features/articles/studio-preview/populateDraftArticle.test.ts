import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { populateDraftArticle } from './populateDraftArticle'

function fakePayload() {
  const find = vi.fn(async ({ collection, where }: { collection: string; where: { id: { in: number[] } } }) => ({
    docs: where.id.in.filter((id) => id !== 404).map((id) => ({ id, from: collection })),
  }))
  return { payload: { find } as unknown as Payload, find }
}

describe('populateDraftArticle', () => {
  it('fills a single-type listicle from its block type', async () => {
    const { payload } = fakePayload()
    const doc = {
      items: [
        { blockType: 'data-nightlife', item: 5, selectedPhotos: [6] },
        { blockType: 'data-attractions', item: 7, tours: [8] },
      ],
    }

    await populateDraftArticle(doc, payload)

    expect(doc.items[0].item).toEqual({ id: 5, from: 'nightlife' })
    expect(doc.items[0].selectedPhotos).toEqual([{ id: 6, from: 'media-sets' }])
    expect(doc.items[1].tours).toEqual([{ id: 8, from: 'tours' }])
  })

  it('fills every relationship the page reads, one query per collection', async () => {
    const { payload, find } = fakePayload()
    const doc = {
      author: 1,
      header: { featuredMediaSet: 2, featuredImage: 3 },
      itineraryDays: [
        {
          whereStaying: [{ blockType: 'itinerary-where-staying', item: 10 }],
          items: [
            { blockType: 'itinerary-dining', item: 11, selectedPhotos: [20, 21], selectedInstagramPost: 30 },
            { blockType: 'itinerary-accommodations', item: 12 },
            {
              blockType: 'itinerary-tour-agency',
              image: 40,
              instagramPost: 31,
              keyLocations: [{ source: 'existing', relatedItem: { relationTo: 'nightlife', value: 50 } }],
            },
          ],
        },
      ],
    }

    await populateDraftArticle(doc, payload)

    const [day] = doc.itineraryDays
    expect(doc.author).toEqual({ id: 1, from: 'authors' })
    expect(doc.header.featuredMediaSet).toEqual({ id: 2, from: 'media-sets' })
    expect(day.whereStaying[0].item).toEqual({ id: 10, from: 'accommodations' })
    expect(day.items[0].item).toEqual({ id: 11, from: 'dining' })
    expect(day.items[0].selectedPhotos).toEqual([
      { id: 20, from: 'media-sets' },
      { id: 21, from: 'media-sets' },
    ])
    expect(day.items[2].keyLocations?.[0].relatedItem.value).toEqual({ id: 50, from: 'nightlife' })

    const collections = find.mock.calls.map(([args]) => args.collection)
    expect(new Set(collections).size).toBe(collections.length)
    expect(find.mock.calls.every(([args]) => (args as unknown as { depth: number }).depth === 1)).toBe(true)
  })

  it('keeps photos in the order the editor chose', async () => {
    const { payload } = fakePayload()
    const doc = {
      itineraryDays: [{ items: [{ blockType: 'itinerary-dining', item: 1, selectedPhotos: [9, 3, 7] }] }],
    }

    await populateDraftArticle(doc, payload)

    const photos = doc.itineraryDays[0].items[0].selectedPhotos as unknown as Array<{ id: number }>
    expect(photos.map((photo) => photo.id)).toEqual([9, 3, 7])
  })

  it('leaves a bare id where the record is gone, and a stop with no place alone', async () => {
    const { payload } = fakePayload()
    const doc = {
      itineraryDays: [
        {
          items: [
            { blockType: 'itinerary-dining', item: 404 },
            { blockType: 'itinerary-dining', item: null },
          ],
        },
      ],
    }

    await populateDraftArticle(doc, payload)

    expect(doc.itineraryDays[0].items.map((row) => row.item)).toEqual([404, null])
  })
})
