import { Field } from 'payload'

export const headerSection: Field = {
  type: 'group',
  name: 'header',
  label: 'Header',
  admin: {
    condition: (data) => Boolean(data?.step1_complete && !data?.in_update_mode),
  },
  fields: [
    {
      name: 'intro',
      type: 'richText',
      required: true,
      admin: {
        description: 'Intro text shown below the header title',
      },
    },
    // Unused since 2026-11-07: every itinerary intro opens with the drop cap
    // (client lib/dropCap.ts). Hidden, not removed, because removing them
    // drops their columns; that cleanup needs a backup and owner approval.
    {
      name: 'dropCap',
      type: 'checkbox',
      defaultValue: false,
      admin: { hidden: true },
    },
    {
      name: 'dropCapStyle',
      type: 'select',
      defaultValue: 'offset-frame',
      options: [
        { label: 'Offset frame', value: 'offset-frame' },
        { label: 'Fine inner line', value: 'inner-line' },
      ],
      admin: { hidden: true },
    },
    {
      name: 'featuredMediaSet',
      type: 'relationship',
      relationTo: 'media-sets',
      admin: {
        description:
          'Preferred: media set whose variants drive public image rendering. When set, used in preference to featuredImage.',
      },
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media-assets',
      admin: {
        description:
          'Legacy featured image. Used as fallback when featuredMediaSet is not set. New itineraries should use featuredMediaSet.',
      },
    },
  ],
}
