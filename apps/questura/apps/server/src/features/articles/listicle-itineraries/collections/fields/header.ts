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
    {
      name: 'dropCap',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Open the intro with a large drop cap, as a magazine opens a story.',
      },
    },
    {
      name: 'dropCapStyle',
      type: 'select',
      defaultValue: 'offset-frame',
      options: [
        { label: 'Offset frame', value: 'offset-frame' },
        { label: 'Fine inner line', value: 'inner-line' },
      ],
      admin: {
        description:
          'How the drop cap is drawn: a black plate with a double-line frame offset behind it, or a black plate with one fine line inside.',
        condition: (_, siblingData) => Boolean(siblingData?.dropCap),
      },
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
