import { describe, expect, it } from 'vitest'

import { getPageHeroPublishBlockers } from './publish'
import { hasPageHeroFieldUpdates, parsePageHeroFields } from './fields'

const READY_IMAGE = { url: 'https://cdn.example/hero.jpg', status: 'ready' }

describe('getPageHeroPublishBlockers', () => {
  it('passes a titled hero with a ready, described photo', () => {
    expect(
      getPageHeroPublishBlockers(
        { sectionHeading: 'Lisbon', heroImage: READY_IMAGE, heroImageAltReady: true },
        0,
      ),
    ).toEqual([])
  })

  it('does not require the supporting line', () => {
    expect(
      getPageHeroPublishBlockers(
        {
          sectionHeading: 'Lisbon',
          sectionSubheading: null,
          heroImage: READY_IMAGE,
          heroImageAltReady: true,
        },
        0,
      ),
    ).toEqual([])
  })

  it('blocks a hero without a title, a ready photo, or alt text', () => {
    expect(
      getPageHeroPublishBlockers(
        { sectionHeading: '  ', heroImage: { url: null, status: 'missing' } },
        2,
      ),
    ).toEqual([
      'Block 3 is missing its title.',
      'Block 3 photo is missing a ready hero placement.',
      'Block 3 photo is missing authored alt text.',
    ])
  })
})

describe('parsePageHeroFields', () => {
  it('omits the photo when the body does not name it', () => {
    const fields = parsePageHeroFields({})
    expect(fields.heroMediaSet).toEqual({ ok: true, omit: true })
    expect(hasPageHeroFieldUpdates(fields)).toBe(false)
  })

  it('accepts a media set id or null', () => {
    expect(parsePageHeroFields({ heroMediaSet: 12 }).heroMediaSet).toEqual({
      ok: true,
      omit: false,
      value: 12,
    })
    expect(parsePageHeroFields({ heroMediaSet: null }).heroMediaSet).toEqual({
      ok: true,
      omit: false,
      value: null,
    })
  })

  it('rejects anything that is not a positive id', () => {
    expect(parsePageHeroFields({ heroMediaSet: 'abc' }).heroMediaSet.ok).toBe(false)
    expect(parsePageHeroFields({ heroMediaSet: -1 }).heroMediaSet.ok).toBe(false)
  })
})
