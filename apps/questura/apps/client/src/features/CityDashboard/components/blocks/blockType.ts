/**
 * BLOCK TYPE STYLES — the named text styles every article-type homepage block
 * uses. The CSS lives in app/styles/global/block-type.css; this file only
 * names the classes so blocks never spell a font size of their own.
 *
 * Rule: any text not in the display serif is ALL CAPS (kicker, byline,
 * section subheading).
 */
export const BLOCK_TYPE = {
  sectionHeading: 'block-type-section-heading',
  sectionSubheading: 'block-type-section-subheading',
  kicker: 'block-type-kicker',
  titleL: 'block-type-title-l',
  titleM: 'block-type-title-m',
  titleS: 'block-type-title-s',
  dek: 'block-type-dek',
  dekLead: 'block-type-dek-lead',
  byline: 'block-type-byline',
} as const

export type BlockTitleLength = 'short' | 'medium' | 'long' | 'very-long'

/** Phone size bucket for a lead title (`data-title-length` on `titleL`). */
export function blockTitleLength(title: string): BlockTitleLength {
  const characterCount = title.trim().length
  if (characterCount <= 28) return 'short'
  if (characterCount <= 44) return 'medium'
  if (characterCount <= 64) return 'long'
  return 'very-long'
}
