import { describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { LOCATION_MANAGER_SERVICE_ACCOUNT } from '@/features/auth/lib/service-account-grants'

/**
 * No collection or global is readable by an anonymous caller on Payload's own
 * REST and GraphQL mounts.
 *
 * The website reads through `/api/public/*`, whose routes use the Local API
 * and decide at serialization time what a reader may see (ADR-0009). Until
 * this was closed, `GET /api/media-assets` handed anyone the whole media
 * catalog -- storage keys, original URLs, uploader ids -- and eighteen other
 * raw collections came with it. This walks the real config, so a collection
 * added later with `read: () => true` fails here rather than shipping open.
 */

type ReadArgs = { req: { user: unknown; payloadAPI: string } }
type Read = (args: ReadArgs) => unknown

const anonymous: ReadArgs = { req: { user: null, payloadAPI: 'REST' } }

const staff = (role: string) => ({
  req: { user: { id: 1, collection: 'users', role, status: 'active' }, payloadAPI: 'REST' },
})
const locationManager = {
  req: {
    user: { id: 1, collection: 'service-accounts', name: LOCATION_MANAGER_SERVICE_ACCOUNT },
    payloadAPI: 'REST',
  },
}

async function entities(): Promise<Array<{ kind: string; slug: string; read?: Read }>> {
  const resolved = await config
  return [
    ...resolved.collections.map((c) => ({ kind: 'collection', slug: c.slug, read: c.access?.read as Read | undefined })),
    ...resolved.globals.map((g) => ({ kind: 'global', slug: g.slug, read: g.access?.read as Read | undefined })),
  ]
}

async function readOf(slug: string): Promise<Read> {
  const found = (await entities()).find((e) => e.slug === slug)
  if (!found?.read) throw new Error(`no read access on ${slug}`)
  return found.read
}

describe('anonymous reads on the Payload mounts', () => {
  it('are refused for every collection and global in the config', async () => {
    const open: string[] = []
    for (const { kind, slug, read } of await entities()) {
      // Payload's default for an unset rule is "signed in", which is closed.
      if (!read) continue
      const verdict = await read(anonymous)
      // A `Where` is a partial grant (e.g. "published only") and counts as open.
      if (verdict !== false) open.push(`${kind} ${slug}: ${JSON.stringify(verdict)}`)
    }
    expect(open).toEqual([])
  })
})

describe('signed-in reads are unchanged', () => {
  it.each([
    'media-assets',
    'media-sets',
    'locations',
    'article-categories',
    'article-tags',
    'currencies',
    'perfect-for-tags',
    'article-redirects',
    'location-homepages',
    'main-homepage',
    'dining',
    'tours',
    'instagram-posts',
    'affiliate-products',
    'single-type-listicles',
  ])('staff (writer and up) still read %s', async (slug) => {
    const read = await readOf(slug)
    await expect(Promise.resolve(read(staff('admin')))).resolves.toBe(true)
    await expect(Promise.resolve(read(staff('writer')))).resolves.toBe(true)
  })

  it.each([
    // Read through grants (service-account-grants.ts).
    'media-assets',
    'media-sets',
    'dining',
    'tours',
    'key-locations',
    'instagram-posts',
    // Read because any signed-in caller may: Location Manager lists and
    // populates these without a grant of its own.
    'locations',
    'article-categories',
    'currencies',
  ])('Location Manager still reads %s', async (slug) => {
    const read = await readOf(slug)
    await expect(Promise.resolve(read(locationManager))).resolves.toBe(true)
  })
})
