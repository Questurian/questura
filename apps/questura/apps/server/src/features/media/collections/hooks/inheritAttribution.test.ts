import { describe, expect, it, vi } from 'vitest'
import { inheritAttribution } from './inheritAttribution'

describe('regenerated variant attribution', () => {
  it('copies snapshots without array IDs and preserves explicit overrides', async () => {
    const findByID = vi.fn().mockResolvedValue({ edit_credit: 'Alan', sources: [{ id: 'old-row', position: 'Left', credit: 'Maria', url: 'https://example.com/photo', mediaAsset: 42 }] })
    const args = { data: { mediaSet: 5 }, req: { payload: { findByID } }, operation: 'create' } as unknown as Parameters<typeof inheritAttribution>[0]
    const data = await inheritAttribution(args)
    expect(data).toMatchObject({ edit_credit: 'Alan', sources: [{ position: 'Left', credit: 'Maria', url: 'https://example.com/photo', mediaAsset: 42 }] })
    expect(data.sources[0]).not.toHaveProperty('id')
    const override = await inheritAttribution({ ...args, data: { mediaSet: 5, sources: [], edit_credit: 'Bea' } })
    expect(override).toMatchObject({ sources: [], edit_credit: 'Bea' })
    expect(findByID).toHaveBeenCalledOnce()
  })
})
