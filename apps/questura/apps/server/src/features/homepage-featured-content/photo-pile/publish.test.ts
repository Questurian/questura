import { describe, expect, it } from 'vitest'

import { hasPhotoPileFieldUpdates, parsePhotoPileFields } from './fields'
import { getPhotoPilePublishBlockers } from './publish'

const READY = { url: 'https://cdn.example/a.webp', status: 'ready' }

describe('getPhotoPilePublishBlockers', () => {
  it('passes three ready photos', () => {
    expect(getPhotoPilePublishBlockers({ pilePhotos: [READY, READY, READY] }, 0)).toEqual([])
  })

  it('blocks a pile of fewer than three photos', () => {
    expect(getPhotoPilePublishBlockers({ pilePhotos: [READY, READY] }, 0)).toEqual([
      'Block 1 needs at least 3 photos (has 2).',
    ])
  })

  it('names each photo without a ready wide crop', () => {
    expect(
      getPhotoPilePublishBlockers(
        { pilePhotos: [READY, { url: null, status: 'missing' }, READY, READY] },
        1,
      ),
    ).toEqual(['Block 2 photo 2 is missing a ready wide crop.'])
  })
})

describe('parsePhotoPileFields', () => {
  it('omits the field when the body does not mention it', () => {
    expect(hasPhotoPileFieldUpdates(parsePhotoPileFields({}))).toBe(false)
  })

  it('accepts ids in order and clears with null', () => {
    expect(parsePhotoPileFields({ photoMediaSets: [4, '9', 2] }).photoMediaSets).toEqual({
      ok: true,
      omit: false,
      value: [4, 9, 2],
    })
    expect(parsePhotoPileFields({ photoMediaSets: null }).photoMediaSets).toEqual({
      ok: true,
      omit: false,
      value: [],
    })
  })

  it('refuses duplicates, bad ids and more than ten photos', () => {
    expect(parsePhotoPileFields({ photoMediaSets: [3, 3] }).photoMediaSets.ok).toBe(false)
    expect(parsePhotoPileFields({ photoMediaSets: [0] }).photoMediaSets.ok).toBe(false)
    expect(parsePhotoPileFields({ photoMediaSets: 'x' }).photoMediaSets.ok).toBe(false)
    expect(
      parsePhotoPileFields({ photoMediaSets: Array.from({ length: 11 }, (_, i) => i + 1) })
        .photoMediaSets.ok,
    ).toBe(false)
  })
})
