import { beforeEach, describe, expect, it, vi } from 'vitest'

import { bylineOnCreate } from './author-for-user'

const find = vi.fn()
const findByID = vi.fn()
const create = vi.fn()

function req(user: Record<string, unknown> | null) {
  return { user, payload: { find, findByID, create } } as never
}

const staff = (role: string, id = 4) => ({ id, role, collection: 'users' })

describe('bylineOnCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    find.mockImplementation(async ({ where }: { where: Record<string, { equals: unknown }> }) => {
      if (where.id) return { docs: where.id.equals === 3 ? [{ id: 3 }] : [] }
      // The caller's own author record.
      return { docs: [{ id: 5 }] }
    })
  })

  it('uses the author an admin names, e.g. the studio publishing for a writer', async () => {
    expect(await bylineOnCreate(req(staff('admin')), 3)).toBe(3)
    expect(await bylineOnCreate(req(staff('admin')), { id: 3 })).toBe(3)
  })

  it('lets an editor name the author too', async () => {
    expect(await bylineOnCreate(req(staff('editor')), 3)).toBe(3)
  })

  it("ignores a writer's choice and credits the writer", async () => {
    expect(await bylineOnCreate(req(staff('writer')), 3)).toBe(5)
  })

  it('falls back to the caller when nobody is named', async () => {
    expect(await bylineOnCreate(req(staff('admin')), undefined)).toBe(5)
    expect(await bylineOnCreate(req(staff('admin')), null)).toBe(5)
  })

  it('refuses an author that does not exist rather than crediting the caller', async () => {
    await expect(bylineOnCreate(req(staff('admin')), 99)).rejects.toThrow('Author 99 does not exist.')
  })

  it('gives a machine caller no byline', async () => {
    expect(await bylineOnCreate(req({ id: 4, collection: 'service-accounts' }), 3)).toBeNull()
  })
})
