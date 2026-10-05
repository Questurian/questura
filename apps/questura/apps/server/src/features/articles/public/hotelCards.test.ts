import { describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'

import { sanitizeHotelCards } from './hotelCards'
import { serializeArticleByCollection } from './serializeArticleBlocks'

function hotelDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: 12,
    title: 'Belmond Miraflores Park',
    type: 'hotel',
    priceLevel: '4',
    core: { name: 'Belmond Miraflores Park', price: '3', district: 'Miraflores', type: 'Luxury hotel' },
    theDetails: {
      address: 'Av. Malecón de la Reserva 1035',
      phone: '+51 1 6104000',
      websiteUrl: 'https://www.belmond.com/miraflores-park',
      bookingUrl: 'booking.example/belmond',
      googleMapsUrl: 'https://maps.google.com/?cid=1',
    },
    website: 'https://www.belmond.com',
    email: 'reservations@example.com',
    phoneNumber: '6104000',
    gallery: [{ image: { id: 41 } }, { image: 42 }],
    status: 'published',
    createdBy: 3,
    ...overrides,
  }
}

function payloadWithMediaSets(docs: unknown[]) {
  const find = vi.fn().mockResolvedValue({ docs })
  return { payload: { find } as unknown as Payload, find }
}

describe('sanitizeHotelCards', () => {
  it('reduces a published accommodation to the public card with its featured photo', async () => {
    const blocks: Array<Record<string, unknown>> = [
      { blockType: 'text', content: 'x' },
      { blockType: 'hotel-card', hotel: hotelDoc() },
    ]
    const { payload, find } = payloadWithMediaSets([
      {
        id: 41,
        alt_text: '',
        variants: { wide: { url: 'https://cdn.example/41_wide.webp', width: 1600, height: 900 } },
      },
    ])

    await sanitizeHotelCards(blocks, payload)

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'media-sets', where: { id: { in: [41] } } }),
    )
    expect(blocks[1].hotel).toEqual({
      id: 12,
      title: 'Belmond Miraflores Park',
      url: 'https://booking.example/belmond',
      type: 'Hotel',
      district: 'Miraflores',
      price: '$$$$',
      image: {
        url: 'https://cdn.example/41_wide.webp',
        alt: 'Belmond Miraflores Park',
        width: 1600,
        height: 900,
      },
    })
  })

  it('falls back through website, map link and profile fields', async () => {
    const blocks: Array<Record<string, unknown>> = [
      {
        blockType: 'hotel-card',
        hotel: hotelDoc({
          type: null,
          priceLevel: null,
          core: { price: '$$', type: 'Aparthotel' },
          theDetails: { bookingUrl: 'javascript:alert(1)', googleMapsUrl: 'https://maps.example/x' },
          website: '',
          gallery: [],
        }),
      },
      {
        blockType: 'hotel-card',
        hotel: hotelDoc({ core: null, theDetails: null, website: null, address: null, priceLevel: '9' }),
      },
    ]
    const { payload, find } = payloadWithMediaSets([])

    await sanitizeHotelCards(blocks, payload)

    expect(blocks[0].hotel).toMatchObject({
      url: 'https://maps.example/x',
      type: 'Aparthotel',
      district: null,
      price: '$$',
      image: null,
    })
    expect(blocks[1].hotel).toMatchObject({ url: null, type: 'Hotel', district: null, price: null })
    expect(find).toHaveBeenCalledTimes(1)
  })

  it('hides a draft, missing or unpopulated accommodation instead of leaking it', async () => {
    const blocks: Array<Record<string, unknown>> = [
      { blockType: 'hotel-card', hotel: hotelDoc({ status: 'draft' }) },
      { blockType: 'hotel-card', hotel: null },
      { blockType: 'hotel-card', hotel: 12 },
    ]
    const { payload, find } = payloadWithMediaSets([])

    await sanitizeHotelCards(blocks, payload)

    expect(blocks.map((block) => block.hotel)).toEqual([null, null, null])
    expect(find).not.toHaveBeenCalled()
  })
})

describe('serializeArticleByCollection hotel cards', () => {
  it('sanitizes Hotel Cards in standard articles', async () => {
    const article: Record<string, unknown> = {
      contentBlocks: [{ blockType: 'hotel-card', hotel: hotelDoc({ gallery: [] }) }],
    }

    await serializeArticleByCollection('articles', article)

    const hotel = (article.contentBlocks as Array<Record<string, unknown>>)[0].hotel
    expect(Object.keys(hotel as object).sort()).toEqual(
      ['district', 'id', 'image', 'price', 'title', 'type', 'url'],
    )
  })
})
