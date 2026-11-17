import { describe, expect, it, vi } from 'vitest'
import { listiclePublicPath, redirectOnListicleUrlChange } from './listicleUrlRedirect'

type Row = { id: number; oldPath: string; newPath: string; source?: string }

/** A stand-in for Payload holding only the article-redirects rows. */
function fakePayload(rows: Row[] = []) {
  let nextId = rows.length + 1
  const matches = (row: Row, where: Record<string, { equals: string }>) =>
    Object.entries(where).every(([field, cond]) => row[field as keyof Row] === cond.equals)
  return {
    rows,
    find: vi.fn(async ({ where }: { where: Record<string, { equals: string }> }) => {
      const docs = rows.filter((row) => matches(row, where))
      return { docs, totalDocs: docs.length }
    }),
    create: vi.fn(async ({ data }: { data: Omit<Row, 'id'> }) => {
      const row = { id: nextId++, ...data }
      rows.push(row)
      return row
    }),
    update: vi.fn(async ({ id, data }: { id: number; data: Partial<Row> }) => {
      const row = rows.find((entry) => entry.id === id)!
      Object.assign(row, data)
      return row
    }),
    delete: vi.fn(async ({ id }: { id: number }) => {
      rows.splice(rows.findIndex((entry) => entry.id === id), 1)
    }),
  }
}

async function runHook(
  type: 'maps' | 'itineraries',
  originalDoc: Record<string, unknown> | undefined,
  data: Record<string, unknown>,
  payload = fakePayload(),
) {
  const hook = redirectOnListicleUrlChange(type)
  await hook({
    data,
    originalDoc,
    req: { payload },
    operation: originalDoc ? 'update' : 'create',
  } as unknown as Parameters<typeof hook>[0])
  return payload
}

const liveGuide = {
  id: 18,
  status: 'published',
  location: 'peru|lima',
  slug: 'best-breakfast-sandwiches-in-lima',
}

describe('listiclePublicPath', () => {
  it('builds city, country and worldwide addresses like the site', () => {
    const base = { slug: 'brunch', status: 'published', type: 'maps' as const }
    expect(listiclePublicPath({ ...base, location: 'peru|lima' })).toBe('/peru/lima/maps/brunch')
    expect(listiclePublicPath({ ...base, location: 'peru|lima|barranco' })).toBe('/peru/lima/maps/brunch')
    expect(listiclePublicPath({ ...base, location: 'peru' })).toBe('/peru/maps/brunch')
    expect(listiclePublicPath({ ...base, location: '' })).toBe('/maps/brunch')
  })

  it('gives drafts no address', () => {
    expect(listiclePublicPath({ location: 'peru|lima', slug: 'brunch', status: 'draft', type: 'maps' })).toBeNull()
  })
})

describe('redirectOnListicleUrlChange', () => {
  it('sends the old address of a renamed live guide to the new one', async () => {
    const payload = await runHook('maps', liveGuide, { ...liveGuide, slug: 'best-sandwiches-lima-peru' })
    expect(payload.rows).toEqual([
      expect.objectContaining({
        oldPath: '/peru/lima/maps/best-breakfast-sandwiches-in-lima',
        newPath: '/peru/lima/maps/best-sandwiches-lima-peru',
        source: 'map-guide-url-change',
      }),
    ])
  })

  it('works for itineraries too', async () => {
    const payload = await runHook(
      'itineraries',
      { ...liveGuide, slug: 'lima-in-a-day' },
      { slug: 'one-day-in-lima' },
    )
    expect(payload.rows[0]).toMatchObject({
      oldPath: '/peru/lima/itineraries/lima-in-a-day',
      newPath: '/peru/lima/itineraries/one-day-in-lima',
    })
  })

  it('does nothing when the address stays the same or the guide was never live', async () => {
    expect((await runHook('maps', liveGuide, { title: 'New title' })).rows).toEqual([])
    expect(
      (await runHook('maps', { ...liveGuide, status: 'draft' }, { slug: 'other' })).rows,
    ).toEqual([])
    expect((await runHook('maps', undefined, { ...liveGuide })).rows).toEqual([])
  })

  it('points older redirects at the newest address, and drops one that now loops', async () => {
    const payload = fakePayload([
      { id: 1, oldPath: '/peru/lima/maps/sandwiches', newPath: '/peru/lima/maps/best-breakfast-sandwiches-in-lima' },
      { id: 2, oldPath: '/peru/lima/maps/best-sandwiches-lima-peru', newPath: '/peru/lima/maps/elsewhere' },
    ])
    await runHook('maps', liveGuide, { slug: 'best-sandwiches-lima-peru' }, payload)
    expect(payload.rows.map(({ oldPath, newPath }) => [oldPath, newPath])).toEqual([
      ['/peru/lima/maps/sandwiches', '/peru/lima/maps/best-sandwiches-lima-peru'],
      ['/peru/lima/maps/best-breakfast-sandwiches-in-lima', '/peru/lima/maps/best-sandwiches-lima-peru'],
    ])
  })
})
