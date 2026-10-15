import { describe, expect, it } from 'vitest'

import { accessTierField, DEFAULT_ACCESS_TIER, isGatedItem } from './accessTier'

describe('access tier defaults', () => {
  it('starts a new article or itinerary behind the paywall', () => {
    expect((accessTierField as { defaultValue?: unknown }).defaultValue).toBe('member')
  })

  it('still reads a missing or unrecognised stored value as free', () => {
    expect(DEFAULT_ACCESS_TIER).toBe('free')
    expect(isGatedItem({})).toBe(false)
    expect(isGatedItem({ access: 'premium' })).toBe(false)
    expect(isGatedItem({ access: 'member' })).toBe(true)
  })
})
