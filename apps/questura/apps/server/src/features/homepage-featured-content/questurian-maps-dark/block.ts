import type { Block } from 'payload'

import { HOMEPAGE_QUESTURIAN_MAPS_DARK_SLOT_COUNT } from '../constants'
import {
  HOMEPAGE_FEATURED_ARTICLES_SECTION_HEADING_MAX,
  HOMEPAGE_FEATURED_ARTICLES_SECTION_SUBHEADING_MAX,
} from '../resolve-page-blocks/lib/section-heading'

/**
 * Six Questurian Maps as a compact thumbnail list with their authors. Items,
 * validation and selection are the `questurian-maps` slice's; only the slot
 * count differs.
 */
export const QuesturianMapsDarkBlock: Block = {
  slug: 'questurian-maps-dark',
  labels: {
    singular: 'Questurian Maps (List)',
    plural: 'Questurian Maps (List) Blocks',
  },
  fields: [
    {
      name: 'slotCount',
      type: 'number',
      required: true,
      min: HOMEPAGE_QUESTURIAN_MAPS_DARK_SLOT_COUNT,
      max: HOMEPAGE_QUESTURIAN_MAPS_DARK_SLOT_COUNT,
      defaultValue: HOMEPAGE_QUESTURIAN_MAPS_DARK_SLOT_COUNT,
      admin: {
        description: 'Always six single-type listicles, three per row.',
      },
    },
    {
      name: 'sectionHeading',
      type: 'text',
      required: false,
      maxLength: HOMEPAGE_FEATURED_ARTICLES_SECTION_HEADING_MAX,
      admin: {
        description: 'Optional headline shown above this block on the public homepage.',
      },
    },
    {
      name: 'sectionSubheading',
      type: 'text',
      required: false,
      maxLength: HOMEPAGE_FEATURED_ARTICLES_SECTION_SUBHEADING_MAX,
      admin: {
        description: 'Optional supporting line under the section heading.',
      },
    },
    {
      name: 'items',
      type: 'relationship',
      relationTo: ['single-type-listicles'] as const,
      hasMany: true,
      admin: {
        description: 'Single-type listicles in display order.',
      },
    },
  ],
}
