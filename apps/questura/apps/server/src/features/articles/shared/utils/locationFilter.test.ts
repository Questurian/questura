import { describe, expect, it } from 'vitest'
import { createLocationFilter } from './locationFilter'

const createPayloadStub = (docs: Array<Record<string, unknown>>) => ({
  find: async ({ collection, where }: { collection: string; where?: Record<string, unknown> }) => {
    expect(collection).toBe('locations')

    const ids = ((where?.id as { in?: Array<string | number> } | undefined)?.in || []).map(String)
    const matches = docs.filter((doc) => ids.includes(String(doc.id)))

    return {
      docs: matches,
      totalDocs: matches.length,
      totalPages: 1,
    }
  },
}) as never

const exactNeighborhoodFilter = {
  and: [
    { status: { equals: 'published' } },
    {
      or: [
        {
          location: {
            in: ['peru|lima|miraflores', 'peru|lima|barranco'],
          },
        },
        {
          locationRef: {
            in: [101, 102],
          },
        },
      ],
    },
  ],
}

describe('article location filter', () => {
  const req = {
    payload: createPayloadStub([
      {
        id: 101,
        level: 'neighborhood',
        parentKey: 'peru|lima',
        locationKey: 'peru|lima|miraflores',
      },
      {
        id: 102,
        level: 'neighborhood',
        parentKey: 'peru|lima',
        locationKey: 'peru|lima|barranco',
      },
    ]),
  } as never

  it('limits article pickers to exact selected neighborhoods', async () => {
    const filter = createLocationFilter('dining')

    await expect(
      filter({
        data: {
          location: 'peru|lima',
          sharedNeighborhoods: [101, 102],
        },
        req,
      } as never),
    ).resolves.toEqual(exactNeighborhoodFilter)
  })

  it('keeps exact neighborhoods exact even when the same country is allowed', async () => {
    const filter = createLocationFilter('attractions', { allowSameCountry: true })

    await expect(
      filter({
        data: {
          location: 'peru|lima',
          sharedNeighborhoods: [101, 102],
        },
        req,
      } as never),
    ).resolves.toEqual(exactNeighborhoodFilter)
  })

  it('opens an itinerary stop picker to the whole country for a day trip', async () => {
    const filter = createLocationFilter('attractions', { allowSameCountry: true })
    const where = (await filter({
      data: {
        location: 'peru|lima',
        sharedNeighborhoods: [],
      },
      req: { payload: { find: async () => ({ docs: [{ id: 251, locationKey: 'peru|lima', level: 'city' }], totalDocs: 1, totalPages: 1 }) } },
    } as never)) as { and: Array<{ or?: Array<Record<string, unknown>> }> }

    expect(where.and[1].or?.[0]).toEqual({ location: { contains: 'peru' } })
  })
})
