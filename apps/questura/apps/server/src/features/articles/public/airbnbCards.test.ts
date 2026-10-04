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
      expect.objectContaining({ collection: 'media-sets', where: { id: { in: [41] } } }),
    )
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
      image: {
        url: 'https://cdn.example/41_wide.webp',
        alt: 'Clifftop Duplex Penthouse with 180° Ocean Views',
        width: 1600,
        height: 900,
      },
    })
    expect(blocks[1].airbnb).not.toHaveProperty('createdBy')
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
    expect(find).not.toHaveBeenCalled()
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
