import { describe, expect, it } from 'vitest'

import { normalizeMapsTheme, parseMapsThemeBodyField } from './theme'

describe('maps theme', () => {
  it('reads anything unknown or missing as blue', () => {
    expect(normalizeMapsTheme(undefined)).toBe('blue')
    expect(normalizeMapsTheme('green')).toBe('blue')
    expect(normalizeMapsTheme('inverted')).toBe('inverted')
  })

  it('parses the body field: omitted, set, reset, refused', () => {
    expect(parseMapsThemeBodyField({})).toEqual({ ok: true, omit: true })
    expect(parseMapsThemeBodyField({ mapsTheme: 'inverted' })).toEqual({
      ok: true,
      omit: false,
      value: 'inverted',
    })
    expect(parseMapsThemeBodyField({ mapsTheme: null })).toEqual({ ok: true, omit: false, value: 'blue' })
    expect(parseMapsThemeBodyField({ mapsTheme: 'dark' }).ok).toBe(false)
  })
})
