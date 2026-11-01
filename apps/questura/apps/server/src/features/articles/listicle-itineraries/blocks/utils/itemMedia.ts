import type { ItemMediaSourceCollection } from '../../../shared/types'
import { createItemMediaFields } from '../../../shared/utils/itemMedia/fields'

const itineraryMediaFieldOptions = {
  mediaModeEnumName: 'itm_media_mode',
  allowNoMedia: true,
  modeDescription:
    'Select whether this itinerary stop uses photos, Instagram, both, or no media (blurb only).',
}

export const createItineraryItemMediaFields = (
  sourceCollection: ItemMediaSourceCollection,
) => createItemMediaFields(sourceCollection, itineraryMediaFieldOptions)
