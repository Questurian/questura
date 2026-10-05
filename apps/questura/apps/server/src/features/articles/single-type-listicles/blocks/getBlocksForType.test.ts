import { describe, expect, it } from 'vitest'
import { getBlocksForType } from './index'

const slugsFor = (type?: string) => getBlocksForType(type).map((block) => block.slug)

describe('single-type listicle blocks per list type', () => {
  it('keeps a single-type list to its one block', () => {
    expect(slugsFor('dining')).toEqual(['data-dining'])
    expect(slugsFor('accommodations')).toEqual(['data-accommodations'])
    expect(slugsFor('attractions')).toEqual(['data-attractions'])
    expect(slugsFor('nightlife')).toEqual(['data-nightlife'])
  })

  it('lets a mixed list hold all four blocks', () => {
    expect(slugsFor('mixed')).toEqual([
      'data-dining',
      'data-accommodations',
      'data-attractions',
      'data-nightlife',
    ])
  })

  it('allows nothing for an unknown or missing type', () => {
    expect(slugsFor('tours')).toEqual([])
    expect(slugsFor(undefined)).toEqual([])
  })
})
