import type { Block } from 'payload'

/** Below three photos the shuffle reads as one photo, not a pile. */
export const PHOTO_PILE_MIN_PHOTOS = 3
export const PHOTO_PILE_MAX_PHOTOS = 10

/**
 * The opening of a navbar section page (Eat, Stay, Itineraries): editor-picked
 * photos the page shuffles like a pile of prints under its name. Holds no
 * curated items and no text; the name is the page's own.
 *
 * Section pages only. Their blocks live in a JSON field, and the location
 * homepage collection leaves this block out of its Payload blocks, so it has
 * no table.
 */
export const PhotoPileBlock: Block = {
  slug: 'photo-pile',
  labels: {
    singular: 'Photo Pile',
    plural: 'Photo Pile Blocks',
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
        description: 'Holds no curated items: only photos.',
      },
    },
    {
      name: 'photoMediaSets',
      type: 'relationship',
      relationTo: 'media-sets',
      hasMany: true,
      maxRows: PHOTO_PILE_MAX_PHOTOS,
      admin: {
        description: 'Top of the pile first. Each photo needs a ready wide (16:9) crop to publish.',
      },
    },
  ],
}
