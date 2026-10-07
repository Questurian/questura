import { beforeEach, describe, expect, it, vi } from 'vitest'

const limiter = vi.hoisted(() => ({ check: vi.fn() }))

vi.mock('@/shared/http/public-read-rate-limit', () => ({
  checkPublicReadRateLimit: limiter.check,
}))

const { anonymousApiBoundsPlugin, boundAnonymousReads, clampAnonymousRead, markRouteCounted } = await import(
  './anonymous-api-bounds'
)

type HookArgs = Parameters<typeof boundAnonymousReads>[0]

function call(args: Record<string, unknown>, req: Record<string, unknown>, operation = 'read') {
  return boundAnonymousReads({ args, operation, req: { headers: new Headers(), ...req } } as unknown as HookArgs)
}

beforeEach(() => {
  limiter.check.mockReset().mockResolvedValue({ allowed: true })
})

describe('boundAnonymousReads', () => {
  // Measured: /api/locations?limit=1000&depth=10 returned 271 MB anonymously.
  it('clamps an anonymous REST read', async () => {
    await expect(call({ limit: 1000, depth: 10, pagination: false }, { payloadAPI: 'REST' })).resolves.toMatchObject({
      limit: 100,
      depth: 2,
      pagination: true,
    })
  })

  it('clamps GraphQL the same way', async () => {
    await expect(call({ limit: 5000 }, { payloadAPI: 'GraphQL' })).resolves.toMatchObject({ limit: 100 })
  })

  it('leaves signed-in staff and service accounts alone', async () => {
    const args = { limit: 200, depth: 3, pagination: false }
    await expect(call(args, { payloadAPI: 'REST', user: { id: 1 } })).resolves.toBe(args)
    expect(limiter.check).not.toHaveBeenCalled()
  })

  it('leaves the Local API alone', async () => {
    const args = { limit: 2000, depth: 3 }
    await expect(call(args, { payloadAPI: 'local' })).resolves.toBe(args)
  })

  it('does not rate-limit the trusted API-key lookup before req.user exists', async () => {
    limiter.check.mockResolvedValue({ allowed: false, retryAfterSeconds: 30 })
    // Payload APIKeyAuthentication calls payload.find with overrideAccess:true,
    // passing the original REST request before assigning the verified user.
    const args = { overrideAccess: true, limit: 1, depth: 0, pagination: false }
    await expect(call(args, { payloadAPI: 'REST', user: null })).resolves.toBe(args)
    expect(limiter.check).not.toHaveBeenCalled()
  })

  it('still limits external reads carrying an unverified credential', async () => {
    limiter.check.mockResolvedValue({ allowed: false, retryAfterSeconds: 30 })
    await expect(call({ overrideAccess: false, limit: 1 }, {
      payloadAPI: 'REST', user: null,
      headers: new Headers({ Authorization: 'service-accounts API-Key invalid' }),
    })).rejects.toMatchObject({ status: 429 })
  })

  it('leaves writes alone', async () => {
    const args = { data: {} }
    await expect(call(args, { payloadAPI: 'REST' }, 'create')).resolves.toBe(args)
  })

  it('refuses an anonymous caller past the per-IP limit with a 429', async () => {
    limiter.check.mockResolvedValue({ allowed: false, retryAfterSeconds: 30 })
    await expect(call({ limit: 1 }, { payloadAPI: 'REST' })).rejects.toMatchObject({ status: 429 })
    expect(limiter.check).toHaveBeenCalledWith(expect.any(Headers), 'payloadApi')
  })
})

// One logical request, one token: the route wrapper already charged it.
describe('a request the route already counted', () => {
  it('is clamped without being charged a second time', async () => {
    const headers = new Headers()
    markRouteCounted(headers)
    await expect(call({ limit: 1000 }, { payloadAPI: 'REST', headers })).resolves.toMatchObject({ limit: 100 })
    expect(limiter.check).not.toHaveBeenCalled()
  })

  it('is charged when the mark is a guess', async () => {
    const headers = new Headers({ 'x-questura-mount-counted': 'guess' })
    await call({ limit: 1 }, { payloadAPI: 'REST', headers })
    expect(limiter.check).toHaveBeenCalledTimes(1)
  })
})

describe('clampAnonymousRead', () => {
  it('keeps smaller requests as asked and fills in missing bounds', () => {
    expect(clampAnonymousRead({ limit: 10, depth: 0 })).toMatchObject({ limit: 10, depth: 0 })
    expect(clampAnonymousRead({})).toMatchObject({ limit: 100, depth: 2, pagination: true })
  })
})

describe('anonymousApiBoundsPlugin', () => {
  it('puts the clamp first on every collection', () => {
    const existing = vi.fn()
    const config = anonymousApiBoundsPlugin({
      collections: [
        { slug: 'a', fields: [] },
        { slug: 'b', fields: [], hooks: { beforeOperation: [existing] } },
      ],
    } as never) as { collections: Array<{ hooks: { beforeOperation: unknown[] } }> }

    expect(config.collections[0]!.hooks.beforeOperation).toEqual([boundAnonymousReads])
    expect(config.collections[1]!.hooks.beforeOperation).toEqual([boundAnonymousReads, existing])
  })
})
