import { describe, expect, it } from 'vitest'

import { curatedBlockRegistry } from '../../block-registry'
import {
  parseBlockUpdateBody,
  validateBlockUpdateFields,
} from '../../location-homepage-blocks/lib/parse-block-update'
import { parseNewBlockInput } from '../../resolve-page-blocks/operations/parse-new-block-input'
import { normalizeAdSlotSize, parseAdSlotSizeBodyField } from './size'

describe('ad slot size', () => {
  it('reads anything unknown or missing as banner', () => {
    expect(normalizeAdSlotSize(undefined)).toBe('banner')
    expect(normalizeAdSlotSize('billboard')).toBe('banner')
    expect(normalizeAdSlotSize('rectangle')).toBe('rectangle')
  })

  it('parses the body field: omitted, set, reset, refused', () => {
    expect(parseAdSlotSizeBodyField({})).toEqual({ ok: true, omit: true })
    expect(parseAdSlotSizeBodyField({ adSize: 'rectangle' })).toEqual({
      ok: true,
      omit: false,
      value: 'rectangle',
    })
    expect(parseAdSlotSizeBodyField({ adSize: null })).toEqual({ ok: true, omit: false, value: 'banner' })
    expect(parseAdSlotSizeBodyField({ adSize: 'popunder' }).ok).toBe(false)
  })
})

describe('ad slot block', () => {
  it('is created with its picked size and no items', () => {
    const created = parseNewBlockInput({ blockType: 'ad-slot', adSize: 'rectangle' })
    expect(created).toMatchObject({
      ok: true,
      block: { blockType: 'ad-slot', slotCount: 0, items: [], adSize: 'rectangle' },
    })
    expect(parseNewBlockInput({ blockType: 'ad-slot' })).toMatchObject({
      ok: true,
      block: { adSize: 'banner' },
    })
  })

  it('only takes an adSize update on an ad-slot block', () => {
    const parsed = parseBlockUpdateBody({ blockId: 'a', adSize: 'rectangle' })
    if (!parsed.ok) throw new Error(parsed.message)
    const { fields } = parsed.input
    expect(validateBlockUpdateFields({ id: 'a', blockType: 'ad-slot' }, fields)).toBeNull()
    expect(validateBlockUpdateFields({ id: 'b', blockType: 'newsletter-signup' }, fields)).toEqual({ message: 'adSize is only supported for ad-slot blocks.' })
  })

  it('sends its size to the editor and the public page', async () => {
    const behavior = curatedBlockRegistry.get('ad-slot')?.behavior
    const ctx = { payload: {} as never, slotCount: 0, locationGridScope: null, block: {} }
    expect(await behavior?.resolveFields?.({ adSize: 'rectangle' }, ctx)).toEqual({ adSize: 'rectangle' })
    expect(await behavior?.resolveFields?.({}, ctx)).toEqual({ adSize: 'banner' })
    expect(behavior?.isArticleBlock).toBe(false)
  })
})
