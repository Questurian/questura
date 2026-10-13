import { describe, expect, it } from 'vitest'
import { buildCanonicalPath } from './canonicalPath'

const published = { categorySlug: 'food', slug: 'ceviche', status: 'published' }

describe('buildCanonicalPath', () => {
  it('puts located articles under their country and city', () => {
    expect(buildCanonicalPath({ ...published, location: 'peru' })).toBe('/peru/food/ceviche')
    expect(buildCanonicalPath({ ...published, location: 'peru|lima' })).toBe('/peru/lima/food/ceviche')
    expect(buildCanonicalPath({ ...published, location: 'peru|lima|barranco' })).toBe(
      '/peru/lima/food/ceviche',
    )
  })

  it('gives a located article no URL until it has a category', () => {
    expect(buildCanonicalPath({ ...published, location: 'peru|lima', categorySlug: null })).toBeNull()
  })

  it('puts worldwide articles (no location) at /articles/<slug>, category or not', () => {
    expect(buildCanonicalPath({ ...published, location: null })).toBe('/articles/ceviche')
    expect(buildCanonicalPath({ ...published, location: '' })).toBe('/articles/ceviche')
    expect(buildCanonicalPath({ ...published, location: null, categorySlug: null })).toBe(
      '/articles/ceviche',
    )
  })

  it('gives drafts and slugless articles no URL', () => {
    expect(buildCanonicalPath({ ...published, location: null, status: 'draft' })).toBeNull()
    expect(buildCanonicalPath({ ...published, location: 'peru|lima', status: 'draft' })).toBeNull()
    expect(buildCanonicalPath({ ...published, location: null, slug: null })).toBeNull()
  })
})
