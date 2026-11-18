import { describe, expect, it } from 'vitest'

import { getDestinationHeaderPublishBlockers } from './publish'
import {
  hasDestinationHeaderFieldUpdates,
  normalizeDestinationDescription,
  parseDestinationHeaderFields,
} from './fields'
import { destinationFocus, destinationHeaderLayout } from './constants'

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

  it('accepts the two layouts and a photo position from 0 to 100', () => {
    const fields = parseDestinationHeaderFields({
      destinationLayout: 'split',
      destinationFocusX: 12.34,
      destinationFocusY: 100,
    })
    expect(fields.destinationLayout).toEqual({ ok: true, omit: false, value: 'split' })
    expect(fields.destinationFocusX).toEqual({ ok: true, omit: false, value: 12.3 })
    expect(fields.destinationFocusY).toEqual({ ok: true, omit: false, value: 100 })
    expect(hasDestinationHeaderFieldUpdates(fields)).toBe(true)
  })

  it('rejects an unknown layout or a position outside 0 to 100', () => {
    expect(
      parseDestinationHeaderFields({ destinationLayout: 'editorial' }).destinationLayout,
    ).toEqual({ ok: true, omit: false, value: 'editorial' })
    expect(parseDestinationHeaderFields({ destinationLayout: 'full' }).destinationLayout.ok).toBe(
      false,
    )
    expect(parseDestinationHeaderFields({ destinationFocusX: 101 }).destinationFocusX.ok).toBe(false)
    expect(parseDestinationHeaderFields({ destinationFocusY: '50' }).destinationFocusY.ok).toBe(
      false,
    )
  })

  it('reads a missing layout as band and a missing position as the centre', () => {
    expect(destinationHeaderLayout(undefined)).toBe('band')
    expect(destinationHeaderLayout('split')).toBe('split')
    expect(destinationHeaderLayout('editorial')).toBe('editorial')
    expect(destinationFocus(null)).toBe(50)
    expect(destinationFocus(140)).toBe(100)
  })

  it('normalizes Windows line breaks', () => {
    expect(normalizeDestinationDescription('A\r\n\r\nB')).toBe('A\n\nB')
  })
})
