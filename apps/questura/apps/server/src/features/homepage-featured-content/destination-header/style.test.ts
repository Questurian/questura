import { describe, expect, it } from 'vitest'

import { DEFAULT_DESTINATION_HEADER_STYLE, destinationHeaderStyle } from './style'

describe('destinationHeaderStyle', () => {
  it('reads an empty or missing global as the defaults', () => {
    expect(destinationHeaderStyle(null)).toEqual(DEFAULT_DESTINATION_HEADER_STYLE)
    expect(destinationHeaderStyle({})).toEqual(DEFAULT_DESTINATION_HEADER_STYLE)
  })

  it('keeps every valid choice', () => {
    const chosen = {
      textFont: 'raleway',
      textWeight: '400',
      textSize: '13',
      textTone: 'ink',
      textAlign: 'centre',
    }
    expect(destinationHeaderStyle({ id: 1, ...chosen, updatedAt: 'x' })).toEqual(chosen)
  })

  it('accepts a numeric size and replaces unknown values with the default', () => {
    expect(
      destinationHeaderStyle({ textFont: 'comic-sans', textWeight: 700, textSize: 16, textAlign: 'bottom' }),
    ).toEqual({ ...DEFAULT_DESTINATION_HEADER_STYLE, textSize: '16' })
  })
})
