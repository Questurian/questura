import type { Block } from 'payload'

import { DEFAULT_AD_SLOT_SIZE } from './constants'

/**
 * One display ad between two homepage blocks. Holds no curated items and no
 * text: the editor only picks where it sits and which shape it is. The ad
 * itself (network, unit keys, the "Advertisement" label) is the client's.
 */
export const AdSlotBlock: Block = {
  slug: 'ad-slot',
  labels: {
    singular: 'Ad',
    plural: 'Ad Blocks',
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
        description: 'Holds no curated items: one ad.',
      },
    },
    {
      name: 'adSize',
      dbName: 'ad_size',
      type: 'select',
      required: false,
      defaultValue: DEFAULT_AD_SLOT_SIZE,
      options: [
        { label: 'Banner: 728x90 (320x50 on phones)', value: 'banner' },
        { label: 'Rectangle: 300x250', value: 'rectangle' },
      ],
      admin: {
        description: 'The ad shape shown on the public page.',
      },
    },
  ],
}
