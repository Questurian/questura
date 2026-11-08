import { describe, expect, it } from 'vitest'

import { teaserPointsFor } from './teaserPoints'

const place = (latitude: number, longitude: number) => ({ item: { id: latitude, latitude, longitude, location: 'peru|lima|barranco' } })

describe('teaserPointsFor', () => {
  it("answers an itinerary's dots as a non-member gets them: rough stops and the real lodging", () => {
    const doc = {
      access: 'free',
      itineraryDays: [{ items: [place(-12.1375, -77.0231), place(-12.0548, -77.0328)] }],
      items: [],
      whereStaying: [{ item: { latitude: -12.1431017, longitude: -77.0238062 } }],
    }

    const points = teaserPointsFor('listicle-itineraries', doc)

    expect(points).toHaveLength(3)
    // Rough, not exact: snapped and nudged, but within a grid cell of the place.
    expect(points[0]).not.toEqual({ lat: -12.1375, lng: -77.0231 })
    expect(Math.abs(points[0].lat - -12.1375)).toBeLessThan(0.006)
    expect(Math.abs(points[1].lng - -77.0328)).toBeLessThan(0.006)
    expect(points[2]).toEqual({ lat: -12.1431017, lng: -77.0238062 })
  })

  it('gates a copy, whatever the tier, and leaves the preview document alone', () => {
    const doc = { access: 'free', items: [place(-12.12, -77.03), place(-12.13, -77.02)] }

    const points = teaserPointsFor('single-type-listicles', doc)

    expect(points).toHaveLength(2)
    expect(doc.items).toHaveLength(2)
    expect(doc.access).toBe('free')
  })

  it('skips places without coordinates', () => {
    expect(teaserPointsFor('single-type-listicles', { items: [{ item: { title: 'No pin' } }, { item: 7 }] })).toEqual([])
  })
})
