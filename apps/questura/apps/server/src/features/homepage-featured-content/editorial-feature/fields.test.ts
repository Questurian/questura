import { describe, expect, it } from 'vitest'

import { hasEditorialFeatureFieldUpdates, parseEditorialFeatureFields } from './fields'

describe('Editorial Feature fields', () => {
  it('omits flag and theme when the body does not name them', () => {
    const fields = parseEditorialFeatureFields({ featureTitle: 'Lima' })
    expect(fields.featureFlag).toEqual({ ok: true, omit: true })
    expect(fields.featureTheme).toEqual({ ok: true, omit: true })
  })

  it('accepts one of the offered flags, and null or empty to clear it', () => {
    expect(parseEditorialFeatureFields({ featureFlag: 'MX' }).featureFlag).toEqual({
      ok: true,
      omit: false,
      value: 'MX',
    })
    expect(parseEditorialFeatureFields({ featureFlag: null }).featureFlag).toEqual({
      ok: true,
      omit: false,
      value: null,
    })
    expect(parseEditorialFeatureFields({ featureFlag: '' }).featureFlag).toEqual({
      ok: true,
      omit: false,
      value: null,
    })
  })

  it('rejects a flag that is not offered', () => {
    expect(parseEditorialFeatureFields({ featureFlag: 'BR' }).featureFlag).toMatchObject({
      ok: false,
    })
    expect(parseEditorialFeatureFields({ featureFlag: 'pe' }).featureFlag).toMatchObject({
      ok: false,
    })
  })

  it('accepts light or dark and rejects anything else', () => {
    expect(parseEditorialFeatureFields({ featureTheme: 'dark' }).featureTheme).toEqual({
      ok: true,
      omit: false,
      value: 'dark',
    })
    expect(parseEditorialFeatureFields({ featureTheme: null }).featureTheme).toMatchObject({
      ok: false,
    })
    expect(parseEditorialFeatureFields({ featureTheme: 'inverted' }).featureTheme).toMatchObject({
      ok: false,
    })
  })

  it('counts a theme-only body as an update', () => {
    expect(hasEditorialFeatureFieldUpdates(parseEditorialFeatureFields({ featureTheme: 'dark' }))).toBe(
      true,
    )
  })
})
