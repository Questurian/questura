import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NextRequest } from 'next/server'

/**
 * The paid body for Google's full-text view (ADR-0009, revised 2026-11-21).
 * A paywall is only as good as its refusals, so most of this is refusals.
 */
const find = vi.fn()
const serializeArticleByCollection = vi.fn(async () => undefined)

vi.mock('payload', () => ({ getPayload: async () => ({ find }) }))
vi.mock('@/payload.config', () => ({ default: {} }))
vi.mock('@/features/articles/public/serializeArticleBlocks', () => ({
  get serializeArticleByCollection() {
    return serializeArticleByCollection
  },
}))
vi.mock('@/shared/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))

const route = await import('./route')
const { resetAdmissionGates } = await import('@/shared/http/admission')

const KEY = 'k'.repeat(48)
const MAP_PATH = '/peru/lima/maps/rooftops'

function post(path: unknown, key: string | null = KEY): NextRequest {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (key !== null) headers.set('x-questura-crawler-key', key)
  return { headers, json: async () => ({ path }) } as unknown as NextRequest
}

const map = (over: Record<string, unknown> = {}) => ({
  id: 17,
  access: 'member',
  location: 'peru|lima|miraflores',
  header: { intro: '<p>Short intro.</p>' },
  items: [
    {
      section: 'Sunset',
      blurb: '<p>Paid blurb.</p>',
      item: { title: 'Sky <Bar>', latitude: -12.123456, longitude: -77.654321, phoneNumber: '+51 999 999 999' },
    },
  ],
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  resetAdmissionGates()
  vi.stubEnv('QUESTURA_CRAWLER_BODY_KEY', KEY)
  find.mockResolvedValue({ totalDocs: 1, docs: [map()] })
})
afterEach(() => vi.unstubAllEnvs())

describe('POST /api/internal/crawler-body: refusals', () => {
  it.each([
    ['no key', null],
    ['an empty key', ''],
    ['a wrong key', 'x'.repeat(48)],
    ['a key that only starts right', KEY.slice(0, 47)],
  ])('answers 404 to %s without touching the database', async (_name, key) => {
    const res = await route.POST(post(MAP_PATH, key))
    expect(res.status).toBe(404)
    expect(res.headers.get('cache-control')).toContain('no-store')
    expect(find).not.toHaveBeenCalled()
  })

  it.each(['', 'short'])('is off when the server key is %j, even for a caller sending it', async (value) => {
    vi.stubEnv('QUESTURA_CRAWLER_BODY_KEY', value)
    expect((await route.POST(post(MAP_PATH, value))).status).toBe(404)
    expect(find).not.toHaveBeenCalled()
  })

  it('has no GET, so nothing on the way can cache it', () => {
    expect('GET' in route).toBe(false)
  })

  it.each([undefined, 42, '', '/', '/join', '/peru/lima', '/api/x', '/peru/lima/maps/../x', '/peru/lima/maps/a?b=1'])(
    'refuses the path %j',
    async (path) => {
      expect((await route.POST(post(path))).status).toBe(404)
      expect(find).not.toHaveBeenCalled()
    },
  )

  it('refuses an item that is free', async () => {
    find.mockResolvedValue({ totalDocs: 1, docs: [map({ access: 'free' })] })
    expect((await route.POST(post(MAP_PATH))).status).toBe(404)
  })

  it('refuses a slug that lives in another city', async () => {
    find.mockResolvedValue({ totalDocs: 1, docs: [map({ location: 'colombia|medellin' })] })
    expect((await route.POST(post(MAP_PATH))).status).toBe(404)
  })

  it('refuses what is not there', async () => {
    find.mockResolvedValue({ totalDocs: 0, docs: [] })
    expect((await route.POST(post(MAP_PATH))).status).toBe(404)
  })

  it('only ever reads published items', async () => {
    await route.POST(post(MAP_PATH))
    expect(JSON.stringify(find.mock.calls[0][0].where)).toContain('"status":{"equals":"published"}')
  })
})

describe('POST /api/internal/crawler-body: the body', () => {
  it('returns the text, escaped and never storable', async () => {
    const res = await route.POST(post(MAP_PATH))
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toContain('no-store')

    const { html } = await res.json()
    expect(html).toContain('<h2>Sunset</h2>')
    expect(html).toContain('Sky &lt;Bar&gt;')
    expect(html).toContain('<p>Paid blurb.</p>')
  })

  it('carries no exact position or contact detail', async () => {
    const { html } = await (await route.POST(post(MAP_PATH))).json()
    for (const secret of ['-12.123456', '-77.654321', '999 999']) expect(html).not.toContain(secret)
  })

  it('does not repeat the part the preview already shows', async () => {
    find.mockResolvedValue({
      totalDocs: 1,
      docs: [
        {
          id: 54,
          access: 'member',
          contentBlocks: [
            { id: 'a', blockType: 'text', content: '<p>Free one.</p>' },
            { id: 'b', blockType: 'text', content: '<p>Free two.</p>' },
            { id: 'c', blockType: 'text', content: '<p>Paid three.</p>' },
            { id: 'd', blockType: 'faq', items: [{ question: 'Is it **safe**?', answer: 'Yes <mostly>.' }] },
          ],
        },
      ],
    })
    const { html } = await (await route.POST(post('/peru/lima/guides/the-guide'))).json()
    expect(html).not.toContain('Free one.')
    expect(html).not.toContain('Free two.')
    expect(html).toContain('<p>Paid three.</p>')
    expect(html).toContain('Is it safe?')
    expect(html).toContain('Yes &lt;mostly&gt;.')
  })

  it('reads an itinerary day by day', async () => {
    find.mockResolvedValue({
      totalDocs: 1,
      docs: [
        {
          id: 23,
          access: 'member',
          location: 'peru|lima',
          itineraryDays: [{ items: [{ activityTitle: 'Dinner', item: { title: 'Isolina' }, blurb: '<p>Order big.</p>' }] }],
        },
      ],
    })
    const { html } = await (await route.POST(post('/peru/lima/itineraries/a-night'))).json()
    expect(html).toContain('<h2>Day 1</h2>')
    expect(html).toContain('Isolina')
    expect(html).toContain('<p>Order big.</p>')
  })
})
