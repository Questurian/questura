import { describe, expect, it } from 'vitest'

import {
  DEFAULT_SAMPLE_LIMITS,
  PIN_GRID_DEGREES,
  applySampleRule,
  areaNameFromLocationKey,
  type SamplePin,
} from './freeSample'

/** Within one grid cell of the real spot, and not on it. */
function expectRoughly(pin: SamplePin | undefined, lat: number, lng: number) {
  expect(pin).toBeDefined()
  expect(Math.abs(pin!.lat - lat)).toBeLessThan(PIN_GRID_DEGREES)
  expect(Math.abs(pin!.lng - lng)).toBeLessThan(PIN_GRID_DEGREES)
  expect([pin!.lat, pin!.lng]).not.toEqual([lat, lng])
}

const text = (i: number) => ({ blockType: 'text', content: `para ${i}` })

describe('applySampleRule — standard articles', () => {
  it('keeps the opening prose and nothing else', () => {
    const doc: Record<string, unknown> = {
      contentBlocks: [text(0), text(1), text(2), text(3)],
    }

    const outcome = applySampleRule('articles', doc)

    expect(outcome).toEqual({ applied: true, unit: 'blocks', shown: 2, total: 4 })
    expect(doc.contentBlocks).toHaveLength(2)
    expect((doc.contentBlocks as { content: string }[]).map((b) => b.content)).toEqual([
      'para 0',
      'para 1',
    ])
  })

  it('withholds editorial blocks even when they come first', () => {
    // These carry standalone value, so an early key-takeaway must not become
    // the free part of a paid article.
    const doc: Record<string, unknown> = {
      contentBlocks: [
        { blockType: 'key-takeaway' },
        { blockType: 'pull-quote' },
        text(0),
        { blockType: 'in-the-know' },
        text(1),
        { blockType: 'faq' },
      ],
    }

    applySampleRule('articles', doc)

    expect((doc.contentBlocks as { blockType: string }[]).map((b) => b.blockType)).toEqual([
      'text',
      'text',
    ])
  })

  it('shows a Read more line inside the opening prose without counting it', () => {
    const doc: Record<string, unknown> = {
      contentBlocks: [
        text(0),
        { blockType: 'read-more', title: 'Lima food', url: '/peru/lima' },
        { blockType: 'image' },
        text(1),
        { blockType: 'read-more', title: 'After the free part', url: '/x' },
        text(2),
      ],
    }

    const outcome = applySampleRule('articles', doc)

    expect((doc.contentBlocks as { blockType: string }[]).map((b) => b.blockType)).toEqual([
      'text',
      'read-more',
      'text',
    ])
    expect(outcome).toEqual({ applied: true, unit: 'blocks', shown: 3, total: 6 })
  })

  it('withholds images', () => {
    const doc: Record<string, unknown> = {
      contentBlocks: [text(0), { blockType: 'image' }, { blockType: 'img-trio' }, text(1)],
    }

    applySampleRule('articles', doc)

    expect((doc.contentBlocks as { blockType: string }[]).map((b) => b.blockType)).toEqual([
      'text',
      'text',
    ])
  })

  it('withholds an unknown future block type by default', () => {
    // Allowlist, not blocklist: a block type added later must not leak just
    // because nobody remembered this file.
    const doc: Record<string, unknown> = {
      contentBlocks: [{ blockType: 'brand-new-editorial-thing' }, text(0), text(1)],
    }

    applySampleRule('articles', doc)

    expect((doc.contentBlocks as { blockType: string }[]).map((b) => b.blockType)).toEqual([
      'text',
      'text',
    ])
  })

  it('reports applied when non-text blocks were removed but every text block survived', () => {
    const doc: Record<string, unknown> = {
      contentBlocks: [text(0), { blockType: 'faq' }],
    }

    const outcome = applySampleRule('articles', doc)

    expect(outcome).toEqual({ applied: true, unit: 'blocks', shown: 1, total: 2 })
  })

  it('handles an article with no prose at all', () => {
    const doc: Record<string, unknown> = { contentBlocks: [{ blockType: 'image' }] }

    const outcome = applySampleRule('articles', doc)

    expect(outcome).toEqual({ applied: true, unit: 'blocks', shown: 0, total: 1 })
    expect(doc.contentBlocks).toEqual([])
  })

  it('honours a caller-supplied limit', () => {
    const doc: Record<string, unknown> = { contentBlocks: [text(0), text(1), text(2)] }

    applySampleRule('articles', doc, { ...DEFAULT_SAMPLE_LIMITS, articleTextBlocks: 1 })

    expect(doc.contentBlocks).toHaveLength(1)
  })
})

describe('applySampleRule — listicle itineraries', () => {
  const day = (n: number) => ({
    items: [{ blockType: 'dining', blurb: `stop ${n}` }],
    whereStaying: [{ blockType: 'itinerary-where-staying', blurb: `hotel ${n}` }],
  })

  it('removes every day and keeps only the top-level lodging', () => {
    const doc: Record<string, unknown> = {
      whereStaying: [{ blockType: 'itinerary-where-staying', blurb: 'Hotel B' }],
      itineraryDays: [day(1), day(2), day(3)],
    }

    const outcome = applySampleRule('listicle-itineraries', doc)

    expect(outcome).toEqual({ applied: true, unit: 'days', shown: 0, total: 3, pins: [] })
    expect(doc.itineraryDays).toEqual([])
    expect(doc.whereStaying).toHaveLength(1)
  })

  it('takes per-day lodging with the day it belongs to', () => {
    // Day lodging is nested inside the day rows, and no day survives.
    const doc: Record<string, unknown> = { itineraryDays: [day(1), day(2)] }

    applySampleRule('listicle-itineraries', doc)

    expect(JSON.stringify(doc.itineraryDays)).not.toContain('hotel')
  })

  it('strips the legacy top-level stop list too', () => {
    const doc: Record<string, unknown> = {
      items: [{ blockType: 'dining' }, { blockType: 'attractions' }],
      whereStaying: [{ blockType: 'itinerary-where-staying' }],
    }

    const outcome = applySampleRule('listicle-itineraries', doc)

    expect(outcome.applied).toBe(true)
    expect(doc.items).toEqual([])
    expect(doc.whereStaying).toHaveLength(1)
  })

  it('reports nothing applied for an itinerary with no body', () => {
    const doc: Record<string, unknown> = { whereStaying: [] }

    expect(applySampleRule('listicle-itineraries', doc)).toEqual({
      applied: false,
      unit: 'days',
      shown: 0,
      total: 0,
      pins: [],
    })
  })

  it('lets each withheld stop through as a rough position and its neighborhood, nothing else', () => {
    const stop = (title: string, latitude: number, longitude: number) => ({
      blockType: 'dining',
      blurb: `why ${title} is worth it`,
      item: {
        title,
        latitude,
        longitude,
        location: 'peru|lima|barranco',
        address: `${title} street`,
        phone: '555',
      },
    })
    const doc: Record<string, unknown> = {
      itineraryDays: [
        { items: [stop('Isolina', -12.15, -77.02), stop('Canta Rana', -12.149, -77.021)] },
        {
          items: [stop('Juanito', -12.148, -77.022)],
          whereStaying: [{ item: { title: 'Day hotel', latitude: -12.1, longitude: -77.0 } }],
        },
      ],
    }

    const outcome = applySampleRule('listicle-itineraries', doc)

    expect(outcome.pins).toHaveLength(3)
    expectRoughly(outcome.pins?.[0], -12.15, -77.02)
    expectRoughly(outcome.pins?.[1], -12.149, -77.021)
    expectRoughly(outcome.pins?.[2], -12.148, -77.022)
    expect(outcome.pins?.map((pin) => pin.area)).toEqual(['Barranco', 'Barranco', 'Barranco'])
    // The pins are the only trace of the stops left anywhere on the document.
    expect(JSON.stringify({ doc, outcome })).not.toMatch(/Isolina|Canta Rana|Juanito|street|555|worth it/)
  })

  it('pins nothing for a stop with no usable coordinates', () => {
    const doc: Record<string, unknown> = {
      itineraryDays: [
        {
          items: [
            { blockType: 'itinerary-tour-agency', item: { title: 'Agency' } },
            { blockType: 'dining', item: { latitude: '-12.1', longitude: -77 } },
            { blockType: 'dining', item: { latitude: Number.NaN, longitude: -77 } },
            { blockType: 'dining', item: 42 },
            null,
          ],
        },
      ],
      items: [{ blockType: 'dining', item: { latitude: -12.2, longitude: -77.1 } }],
    }

    const pins = applySampleRule('listicle-itineraries', doc).pins
    expect(pins).toHaveLength(1)
    expectRoughly(pins?.[0], -12.2, -77.1)
    expect(pins?.[0]?.area).toBeNull()
  })

  it('draws the same rough pins every time, so cached and fresh pages agree', () => {
    const build = () => ({
      itineraryDays: [{ items: [{ blockType: 'dining', item: { latitude: -12.1234, longitude: -77.0321 } }] }],
    })

    expect(applySampleRule('listicle-itineraries', build()).pins).toEqual(
      applySampleRule('listicle-itineraries', build()).pins,
    )
  })
})

describe('areaNameFromLocationKey', () => {
  it('names the neighborhood at the end of a location key', () => {
    expect(areaNameFromLocationKey('peru|lima|miraflores')).toBe('Miraflores')
    expect(areaNameFromLocationKey('peru|lima|magdalena-del-mar')).toBe('Magdalena del Mar')
    expect(areaNameFromLocationKey('peru|lima|san-juan-de-miraflores')).toBe('San Juan de Miraflores')
    expect(areaNameFromLocationKey('peru|lima|lima-centro')).toBe('Lima Centro')
  })

  it('says nothing for a city, a country or no key', () => {
    expect(areaNameFromLocationKey('peru|lima')).toBeNull()
    expect(areaNameFromLocationKey('peru')).toBeNull()
    expect(areaNameFromLocationKey(null)).toBeNull()
    expect(areaNameFromLocationKey('peru|lima|')).toBeNull()
  })
})

describe('applySampleRule — single-type listicles', () => {
  const place = (i: number, extra: Record<string, unknown> = {}) => ({
    blockType: 'data-dining',
    item: { title: `Place ${i}`, latitude: -12 - i / 10, longitude: -77 - i / 10 },
    blurb: `Why place ${i} is worth it`,
    ...extra,
  })

  // Owner's choice for now: header and intro only.
  const three = { ...DEFAULT_SAMPLE_LIMITS, listicleItems: 3 }

  it('shows no place by default', () => {
    const doc: Record<string, unknown> = { items: Array.from({ length: 4 }, (_, i) => place(i)) }

    const outcome = applySampleRule('single-type-listicles', doc)

    expect(DEFAULT_SAMPLE_LIMITS.listicleItems).toBe(0)
    expect(outcome).toMatchObject({ applied: true, unit: 'items', shown: 0, total: 4 })
    expect(doc.items).toEqual([])
    expect(outcome.pins).toHaveLength(4)
    expect(JSON.stringify(doc)).not.toContain('Place')
  })

  it('keeps the leading places when the limit allows some', () => {
    const doc: Record<string, unknown> = { items: Array.from({ length: 7 }, (_, i) => place(i)) }

    const outcome = applySampleRule('single-type-listicles', doc, three)

    expect(outcome).toMatchObject({ applied: true, unit: 'items', shown: 3, total: 7 })
    expect((doc.items as Array<{ item: { title: string } }>).map((row) => row.item.title)).toEqual([
      'Place 0',
      'Place 1',
      'Place 2',
    ])
  })

  it('pins each withheld place by rough position and neighborhood only', () => {
    const withArea = place(3)
    withArea.item = { ...withArea.item, location: 'peru|lima|magdalena-del-mar' } as typeof withArea.item
    const doc: Record<string, unknown> = {
      items: [place(0), place(1), place(2), withArea, { blockType: 'data-dining', item: { title: 'No coordinates' } }],
    }

    const outcome = applySampleRule('single-type-listicles', doc, three)

    expect(outcome.pins).toHaveLength(1)
    expectRoughly(outcome.pins?.[0], -12.3, -77.3)
    expect(outcome.pins?.[0]?.area).toBe('Magdalena del Mar')
    expect(JSON.stringify(outcome)).not.toContain('Place 3')
    expect(JSON.stringify(outcome)).not.toContain('No coordinates')
  })

  it('reports the moment of every place, so a full list can be headed', () => {
    const doc: Record<string, unknown> = {
      items: [place(0, { moment: 'rooftop' }), place(1), place(2), place(3, { moment: 'late-night' })],
    }

    expect(applySampleRule('single-type-listicles', doc).itemMoments).toEqual([
      'rooftop',
      null,
      null,
      'late-night',
    ])
  })

  it('drops the stored JSON-LD, which names every place', () => {
    const doc: Record<string, unknown> = {
      items: [place(0), place(1), place(2), place(3)],
      seoSection: {
        metaDescription: 'Kept',
        structuredData: { '@type': 'ItemList', itemListElement: [{ name: 'Place 3' }] },
      },
    }

    applySampleRule('single-type-listicles', doc)

    expect(doc.seoSection).toEqual({ metaDescription: 'Kept' })
  })

  it('cuts nothing from a list no longer than the sample, but still reports it', () => {
    const doc: Record<string, unknown> = { items: [place(0), place(1)] }

    const outcome = applySampleRule('single-type-listicles', doc, three)

    expect(outcome).toMatchObject({ applied: false, unit: 'items', shown: 2, total: 2, pins: [] })
    expect(doc.items).toHaveLength(2)
  })
})
