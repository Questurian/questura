import { describe, expect, it } from 'vitest'
import { DataAccommodationsBlock, DataAttractionsBlock, DataDiningBlock, DataNightlifeBlock } from './index'
import { LISTICLE_MOMENT_OPTIONS } from './utils/momentFields'

describe('single-type listicle moment field', () => {
  it('adds an optional moment to every data block', () => {
    for (const block of [DataDiningBlock, DataAccommodationsBlock, DataAttractionsBlock, DataNightlifeBlock]) {
      const moment = block.fields.find((field) => 'name' in field && field.name === 'moment')
      expect(moment).toMatchObject({ type: 'select', enumName: 'listicle_moment' })
      expect(moment && 'required' in moment ? moment.required : undefined).toBeFalsy()
    }
  })

  it('has unique values', () => {
    const values = LISTICLE_MOMENT_OPTIONS.map((option) => option.value)
    expect(new Set(values).size).toBe(values.length)
  })
})
