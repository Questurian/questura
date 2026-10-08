export type ItemMediaBlockSlug =
  | 'data-dining'
  | 'data-accommodations'
  | 'data-attractions'
  | 'data-nightlife'
  | 'itinerary-dining'
  | 'itinerary-accommodations'
  | 'itinerary-where-staying'
  | 'itinerary-attractions'
  | 'itinerary-nightlife'
  | 'itinerary-key-location'

export type ItemMediaSourceCollection =
  | 'dining'
  | 'accommodations'
  | 'attractions'
  | 'nightlife'
  | 'key-locations'

export type MediaMode = 'photos' | 'instagram' | 'both'

/** A listicle item can also run with no media at all: just the blurb. */
export type ListicleMediaMode = MediaMode | 'none'

export type SourceItemMediaIds = {
  photoIds: Array<string | number>
  instagramPostIds: Array<string | number>
}

export type ItemMediaFieldOptions = {
  mediaModeDbName?: string
  mediaModeEnumName?: string
  /** Adds the "no media" choice. Listicle items only; itinerary stops always carry media. */
  allowNoMedia?: boolean
  modeDescription?: string
  photosDescription?: string
  instagramDescription?: string
}
