import type { Block } from 'payload'

import {
  HOMEPAGE_FEATURED_ARTICLES_SECTION_HEADING_MAX,
  HOMEPAGE_FEATURED_ARTICLES_SECTION_SUBHEADING_MAX,
} from '../resolve-page-blocks/lib/section-heading'

/**
 * A page-opening banner: a large title, one supporting line, and one wide
 * editor-picked photo. It holds no curated items; the title and line reuse the
 * section heading fields every block already carries.
 */
export const PageHeroBlock: Block = {
  slug: 'page-hero',
  labels: {
    singular: 'Page Hero',
    plural: 'Page Hero Blocks',
  },
  fields: [
    {
      name: 'slotCount',
      type: 'number',
      required: true,
      min: 0,
      max: 0,
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: 'Holds no curated items: a title, a supporting line and one photo.',
      },
    },
    {
      name: 'sectionHeading',
      type: 'text',
      required: false,
      maxLength: HOMEPAGE_FEATURED_ARTICLES_SECTION_HEADING_MAX,
      admin: { description: 'Large page title.' },
    },
    {
      name: 'sectionSubheading',
      type: 'text',
      required: false,
      maxLength: HOMEPAGE_FEATURED_ARTICLES_SECTION_SUBHEADING_MAX,
      admin: { description: 'Supporting line under the title.' },
    },
    {
      name: 'heroMediaSet',
      type: 'relationship',
      relationTo: 'media-sets',
      admin: { description: 'Banner photo. A ready hero (21:9) variant is required to publish.' },
    },
  ],
}
