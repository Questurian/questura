import { describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'

import { sanitizeStayLists } from './stayLists'

const hotelDoc = (overrides: Record<string, unknown> = {}) => ({
  id: 12,
  title: 'Belmond Miraflores Park',
  type: 'boutique',
  priceLevel: '4',
  core: { district: 'Miraflores' },
  theDetails: { bookingUrl: 'booking.example/belmond' },
  email: 'reservations@example.com',
  gallery: [{ image: 41 }],
  status: 'published',
  ...overrides,
})

const airbnbDoc = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  title: 'Clifftop Duplex',
  listingUrl: 'https://www.airbnb.com/rooms/30369019',
  rating: 4.87,
  locationRef: { neighborhoodName: 'Barranco' },
  gallery: [{ image: { id: 42 } }, { image: 43 }],
  status: 'published',
  ...overrides,
})

const variant = (id: number) => ({
  id,
  alt_text: '',
  variants: { wide: { url: `https://cdn.example/${id}_wide.webp`, width: 1600, height: 900 } },
})

describe('sanitizeStayLists', () => {
  it('reduces hotels and Airbnbs to public rows in order, leaving out hidden ones', async () => {
    const blocks: Array<Record<string, unknown>> = [
      {
        blockType: 'hotel-list',
        label: '  ',
        stays: [
          { relationTo: 'airbnbs', value: airbnbDoc() },
          { relationTo: 'accommodations', value: hotelDoc({ status: 'draft' }) },
          { relationTo: 'accommodations', value: 12 },
          { relationTo: 'accommodations', value: hotelDoc() },
          { relationTo: 'tours', value: { id: 1, status: 'published' } },
        ],
      },
      { blockType: 'hotel-list', stays: null },
    ]
    const find = vi.fn().mockResolvedValue({ docs: [variant(41), variant(42)] })

    await sanitizeStayLists(blocks, { find } as unknown as Payload)

    expect(blocks[0].label).toBeNull()
    expect(blocks[0].stays).toEqual([
      {
        kind: 'airbnb',
        id: 7,
        title: 'Clifftop Duplex',
        url: 'https://www.airbnb.com/rooms/30369019',
        type: 'Airbnb',
        district: 'Barranco',
        price: null,
        rating: 4.87,
        image: { url: 'https://cdn.example/42_wide.webp', alt: 'Clifftop Duplex', width: 1600, height: 900 },
      },
      {
        kind: 'hotel',
        id: 12,
        title: 'Belmond Miraflores Park',
        url: 'https://booking.example/belmond',
        type: 'Boutique Hotel',
        district: 'Miraflores',
        price: '$$$$',
        rating: null,
        image: { url: 'https://cdn.example/41_wide.webp', alt: 'Belmond Miraflores Park', width: 1600, height: 900 },
      },
    ])
    expect(blocks[1]).toMatchObject({ stays: [], label: null })
    expect(find).toHaveBeenCalledTimes(1)
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: [42, 41] } } }))
  })
})
