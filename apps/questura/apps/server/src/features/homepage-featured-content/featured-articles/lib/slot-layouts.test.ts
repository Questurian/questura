import { describe, expect, it } from 'vitest'

import { parseSlot5LayoutBodyField } from './slot-layouts'

describe('parseSlot5LayoutBodyField', () => {
  it('accepts the two 5-slot layouts', () => {
    expect(parseSlot5LayoutBodyField({ slot5Layout: 'hero-sidebar' })).toEqual({
      ok: true,
      omit: false,
      value: 'hero-sidebar',
    })
    expect(parseSlot5LayoutBodyField({ slot5Layout: 'center-lead' })).toEqual({
      ok: true,
      omit: false,
      value: 'center-lead',
    })
  })

  it('stores the retired card-grid, or a cleared value, as the magazine', () => {
    for (const slot5Layout of ['card-grid', null]) {
      expect(parseSlot5LayoutBodyField({ slot5Layout })).toEqual({
        ok: true,
        omit: false,
        value: 'hero-sidebar',
      })
    }
  })

  it('omits a missing field and rejects unknown layouts', () => {
    expect(parseSlot5LayoutBodyField({})).toEqual({ ok: true, omit: true })
    expect(parseSlot5LayoutBodyField({ slot5Layout: 'mosaic' })).toEqual({
      ok: false,
      message: 'slot5Layout must be one of: hero-sidebar, center-lead.',
    })
  })
})
