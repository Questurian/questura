import { describe, expect, it } from 'vitest'

import { getDestinationHeaderPublishBlockers } from './publish'
import {
  hasDestinationHeaderFieldUpdates,
  normalizeDestinationDescription,
  parseDestinationHeaderFields,
} from './fields'

const READY_IMAGE = { url: 'https://cdn.example/lima.jpg', status: 'ready' }

describe('getDestinationHeaderPublishBlockers', () => {
  it('passes a titled, described header with a ready, described photo', () => {
    expect(
      getDestinationHeaderPublishBlockers(
        {
          sectionHeading: 'Lima',
          destinationDescription: 'A capital on the cliffs.',
          destinationImage: READY_IMAGE,
          destinationImageAltReady: true,
        },
        0,
      ),
    ).toEqual([])
  })

  it('blocks a header without a title, description, ready photo, or alt text', () => {
    expect(
      getDestinationHeaderPublishBlockers(
        {
          sectionHeading: ' ',
          destinationDescription: null,
          destinationImage: { url: null, status: 'missing' },
        },
        1,
      ),
    ).toEqual([
      'Block 2 is missing its title.',
      'Block 2 is missing its description.',
      'Block 2 photo is missing a ready hero placement.',
      'Block 2 photo is missing authored alt text.',
    ])
  })
})

describe('parseDestinationHeaderFields', () => {
  it('omits fields the body does not name', () => {
    const fields = parseDestinationHeaderFields({})
    expect(fields.destinationMediaSet).toEqual({ ok: true, omit: true })
    expect(fields.destinationDescription).toEqual({ ok: true, omit: true })
    expect(hasDestinationHeaderFieldUpdates(fields)).toBe(false)
  })

  it('accepts a media set id or null', () => {
    expect(parseDestinationHeaderFields({ destinationMediaSet: 12 }).destinationMediaSet).toEqual({
      ok: true,
      omit: false,
      value: 12,
    })
    expect(
      parseDestinationHeaderFields({ destinationMediaSet: null }).destinationMediaSet,
    ).toEqual({ ok: true, omit: false, value: null })
    expect(parseDestinationHeaderFields({ destinationMediaSet: 'x' }).destinationMediaSet.ok).toBe(
      false,
    )
  })

  it('keeps paragraphs, trims, and clears an empty description', () => {
    expect(
      parseDestinationHeaderFields({ destinationDescription: '  One\nline.\n\n\n Two. ' })
        .destinationDescription,
    ).toEqual({ ok: true, omit: false, value: 'One line.\n\nTwo.' })
    expect(
      parseDestinationHeaderFields({ destinationDescription: '   ' }).destinationDescription,
    ).toEqual({ ok: true, omit: false, value: null })
  })

  it('rejects a description that is too long or not text', () => {
    expect(
      parseDestinationHeaderFields({ destinationDescription: 'a'.repeat(1501) })
        .destinationDescription.ok,
    ).toBe(false)
    expect(
      parseDestinationHeaderFields({ destinationDescription: 5 }).destinationDescription.ok,
    ).toBe(false)
  })

  it('normalizes Windows line breaks', () => {
    expect(normalizeDestinationDescription('A\r\n\r\nB')).toBe('A\n\nB')
  })
})
