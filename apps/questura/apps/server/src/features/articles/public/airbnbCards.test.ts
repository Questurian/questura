import { describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'

import { sanitizeAirbnbCards } from './airbnbCards'
import { serializeArticleByCollection } from './serializeArticleBlocks'

function airbnbDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    title: 'Clifftop Duplex Penthouse with 180° Ocean Views',
    listingUrl: 'https://www.airbnb.com/rooms/30369019',
    stayType: 'Entire 1-bedroom duplex condo, sleeps 2',
    near: 'Malecón Cisneros clifftop',
    description: 'Wall to wall windows over the Pacific.',
    price: '',
    rating: 4.87,
    reviewCount: 308,
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

describe('sanitizeAirbnbCards', () => {
  it('reduces a published Airbnb to the public card with its featured photo', async () => {
    const blocks: Array<Record<string, unknown>> = [
      { blockType: 'text', content: 'x' },
      { blockType: 'airbnb-card', airbnb: airbnbDoc() },
    ]
    const { payload, find } = payloadWithMediaSets([
      {
        id: 41,
        alt_text: '',
        variants: { wide: { url: 'https://cdn.example/41_wide.webp', width: 1600, height: 900 } },
      },
    ])

    await sanitizeAirbnbCards(blocks, payload)

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'media-sets', where: { id: { in: [41, 42] } } }),
    )
    const featured = {
      url: 'https://cdn.example/41_wide.webp',
      alt: 'Clifftop Duplex Penthouse with 180° Ocean Views',
      width: 1600,
      height: 900,
    }
    expect(blocks[1].airbnb).toEqual({
      id: 7,
      title: 'Clifftop Duplex Penthouse with 180° Ocean Views',
      listingUrl: 'https://www.airbnb.com/rooms/30369019',
      stayType: 'Entire 1-bedroom duplex condo, sleeps 2',
      near: 'Malecón Cisneros clifftop',
      description: 'Wall to wall windows over the Pacific.',
      price: null,
      rating: 4.87,
      reviewCount: 308,
      area: null,
      // 42 did not resolve, so the gallery is the one photo that did.
      images: [featured],
      image: featured,
    })
    expect(blocks[1].airbnb).not.toHaveProperty('createdBy')
  })

  it('carries the host photo credit for the credit line', async () => {
    const blocks: Array<Record<string, unknown>> = [{ blockType: 'airbnb-card', airbnb: airbnbDoc() }]
    const { payload } = payloadWithMediaSets([
      {
        id: 41,
        photographer_credit: 'Alvaro / Airbnb',
        variants: { wide: { url: 'https://cdn.example/41_wide.webp', width: 1600, height: 900 } },
      },
    ])

    await sanitizeAirbnbCards(blocks, payload)

    const image = (blocks[0].airbnb as { image: Record<string, unknown> }).image
    expect(image.photographer_credit).toBe('Alvaro / Airbnb')
    expect(image).not.toHaveProperty('sources')
    expect(image).not.toHaveProperty('edit_credit')
  })

  it('hides a draft, missing or unpopulated Airbnb instead of leaking it', async () => {
    const blocks: Array<Record<string, unknown>> = [
      { blockType: 'airbnb-card', airbnb: airbnbDoc({ status: 'draft' }) },
      { blockType: 'airbnb-card', airbnb: null },
      { blockType: 'airbnb-card', airbnb: 7 },
    ]
    const { payload, find } = payloadWithMediaSets([])

    await sanitizeAirbnbCards(blocks, payload)

    expect(blocks.map((block) => block.airbnb)).toEqual([null, null, null])
    expect(find).not.toHaveBeenCalled()
  })

  it('keeps a card without photos and makes no media query', async () => {
    const blocks: Array<Record<string, unknown>> = [
      { blockType: 'airbnb-card', airbnb: airbnbDoc({ gallery: [] }) },
    ]
    const { payload, find } = payloadWithMediaSets([])

    await sanitizeAirbnbCards(blocks, payload)

    expect((blocks[0].airbnb as { image: unknown }).image).toBeNull()
    expect((blocks[0].airbnb as { images: unknown }).images).toEqual([])
    expect(find).not.toHaveBeenCalled()
  })

  it('shows the first seven gallery photos in the saved order, in one query', async () => {
    const gallery = [44, 43, 45, 46, 47, 48, 49, 50, 51].map((id) => ({ image: id }))
    const blocks: Array<Record<string, unknown>> = [
      { blockType: 'airbnb-card', airbnb: airbnbDoc({ gallery }) },
      { blockType: 'airbnb-card', airbnb: airbnbDoc({ id: 8, gallery: [{ image: 43 }] }) },
    ]
    const mediaSet = (id: number) => ({
      id,
      alt_text: id === 43 ? 'The balcony at sunset' : '',
      variants: { wide: { url: `https://cdn.example/${id}_wide.webp`, width: 1600, height: 900 } },
    })
    const { payload, find } = payloadWithMediaSets([43, 44, 45, 46, 47, 48, 49].map(mediaSet))

    await sanitizeAirbnbCards(blocks, payload)

    expect(find).toHaveBeenCalledTimes(1)
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [44, 43, 45, 46, 47, 48, 49] } }, limit: 7 }),
    )
    const first = blocks[0].airbnb as { images: Array<{ url: string; alt: string }>; image: unknown }
    expect(first.images.map((image) => image.url)).toEqual(
      [44, 43, 45, 46, 47, 48, 49].map((id) => `https://cdn.example/${id}_wide.webp`),
    )
    expect(first.image).toEqual(first.images[0])
    expect(first.images[0].alt).toBe('Clifftop Duplex Penthouse with 180° Ocean Views')
    expect(first.images[1].alt).toBe('The balcony at sunset')
    expect(first.images[2].alt).toBe('Clifftop Duplex Penthouse with 180° Ocean Views, photo 3')
    expect((blocks[1].airbnb as { images: unknown[] }).images).toHaveLength(1)
  })

  it('leaves out a gallery photo with no wide crop and counts each photo once', async () => {
    const blocks: Array<Record<string, unknown>> = [
      {
        blockType: 'airbnb-card',
        airbnb: airbnbDoc({ gallery: [{ image: 41 }, { image: 41 }, { image: { id: 42 } }, { image: 43 }] }),
      },
    ]
    const { payload } = payloadWithMediaSets([
      { id: 41, variants: { wide: { url: 'https://cdn.example/41_wide.webp', width: 1600, height: 900 } } },
      { id: 42, variants: { square: { url: 'https://cdn.example/42_square.webp', width: 1080, height: 1080 } } },
      { id: 43, variants: { wide: { url: 'https://cdn.example/43_wide.webp', width: 1600, height: 900 } } },
    ])

    await sanitizeAirbnbCards(blocks, payload)

    const card = blocks[0].airbnb as { images: Array<{ url: string }> }
    expect(card.images.map((image) => image.url)).toEqual([
      'https://cdn.example/41_wide.webp',
      'https://cdn.example/43_wide.webp',
    ])
  })

  it('names the neighbourhood the Airbnb is tagged with', async () => {
    const blocks: Array<Record<string, unknown>> = [
      {
        blockType: 'airbnb-card',
        airbnb: airbnbDoc({
          gallery: [],
          locationRef: { id: 3, level: 'neighborhood', cityName: 'Lima', neighborhoodName: 'Miraflores' },
        }),
      },
      { blockType: 'airbnb-card', airbnb: airbnbDoc({ id: 8, gallery: [], locationRef: 3 }) },
    ]

    await sanitizeAirbnbCards(blocks)

    expect((blocks[0].airbnb as { area: unknown }).area).toBe('Miraflores')
    expect((blocks[1].airbnb as { area: unknown }).area).toBeNull()
  })
})

describe('serializeArticleByCollection airbnb cards', () => {
  it('sanitizes Airbnb Cards in standard articles', async () => {
    const article: Record<string, unknown> = {
      contentBlocks: [{ blockType: 'airbnb-card', airbnb: airbnbDoc({ status: 'draft' }) }],
    }

    await serializeArticleByCollection('articles', article)

    expect((article.contentBlocks as Array<Record<string, unknown>>)[0].airbnb).toBeNull()
  })
})
