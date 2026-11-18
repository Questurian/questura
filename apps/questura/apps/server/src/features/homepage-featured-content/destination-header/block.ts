import type { Block } from 'payload'

import { HOMEPAGE_FEATURED_ARTICLES_SECTION_HEADING_MAX } from '../resolve-page-blocks/lib/section-heading'
import { DESTINATION_HEADER_DESCRIPTION_MAX } from './constants'

/**
 * The header that opens a destination page: one full-width photo, then a
 * breadcrumb, the destination's name and a paragraph about it. It holds no
 * curated items. The title is the section heading every block carries; the
 * breadcrumb is drawn from the page's location, so nothing stores it.
 */
export const DestinationHeaderBlock: Block = {
  slug: 'destination-header',
  labels: {
    singular: 'Destination Header',
    plural: 'Destination Header Blocks',
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
        description: 'Holds no curated items: a photo, a title and a description.',
      },
    },
    {
      name: 'sectionHeading',
      type: 'text',
      required: false,
      maxLength: HOMEPAGE_FEATURED_ARTICLES_SECTION_HEADING_MAX,
      admin: { description: 'Destination name, e.g. "Lima".' },
    },
    {
      name: 'destinationDescription',
      type: 'textarea',
      required: false,
      maxLength: DESTINATION_HEADER_DESCRIPTION_MAX,
      admin: { description: 'Plain text under the title. A blank line starts a new paragraph.' },
    },
    {
      name: 'destinationMediaSet',
      type: 'relationship',
      relationTo: 'media-sets',
      admin: { description: 'Header photo. A ready hero (21:9) variant is required to publish.' },
    },
  ],
}
