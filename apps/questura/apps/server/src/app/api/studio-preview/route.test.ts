import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authenticateRequest = vi.hoisted(() => vi.fn())
const populateDraftItinerary = vi.hoisted(() => vi.fn(async (doc: unknown) => doc))
const serializeArticleByCollection = vi.hoisted(() => vi.fn(async () => undefined))

vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({})) }))
vi.mock('@/payload.config', () => ({ default: {} }))
vi.mock('@/features/auth/lib/auth-middleware', () => ({ authenticateRequest }))
vi.mock('@/features/articles/studio-preview/populateDraftArticle', () => ({ populateDraftItinerary }))
vi.mock('@/features/articles/public/serializeArticleBlocks', () => ({ serializeArticleByCollection }))

import { POST } from './route'

function post(body: unknown) {
  return new NextRequest('http://localhost:4000/api/studio-preview', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/studio-preview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authenticateRequest.mockResolvedValue({ user: { id: 1 }, error: null, status: 200 })
  })

  it('refuses anyone who is not staff before reading anything', async () => {
    authenticateRequest.mockResolvedValue({ user: null, error: 'Authentication required', status: 401 })

    const response = await POST(post({ doc: { title: 'x' } }))

    expect(response.status).toBe(401)
    expect(populateDraftItinerary).not.toHaveBeenCalled()
  })

  it('needs a document', async () => {
    const response = await POST(post({ doc: [] }))
    expect(response.status).toBe(400)
  })

  it('answers with the serialized article and is never cached', async () => {
    const response = await POST(post({ doc: { title: 'Draft day' } }))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ title: 'Draft day' })
    expect(serializeArticleByCollection).toHaveBeenCalledWith('listicle-itineraries', { title: 'Draft day' }, {})
  })
})
