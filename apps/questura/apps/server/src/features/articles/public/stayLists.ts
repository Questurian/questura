import type { Payload } from 'payload'

import { galleryMediaSetIds, toPublicAirbnbCard } from './airbnbCards'
import {
  featuredMediaSetId,
  resolveWideCardImages,
  toPublicHotelCard,
  type PublicHotelCardImage,
} from './hotelCards'

/**
 * One row of a Stay List: a hotel or an Airbnb reduced to what the compact
 * row prints. `price` is a hotel's dollar ticks; `rating` an Airbnb's stars.
 */
export type PublicStay = {
  kind: 'hotel' | 'airbnb'
  id: number
  title: string
  url: string | null
  /** "Hotel", "Boutique Hotel", "Airbnb"... */
  type: string | null
  district: string | null
  price: string | null
  rating: number | null
  image: PublicHotelCardImage | null
}

function toStay(entry: unknown): { stay: PublicStay; mediaSetId: number | null } | null {
  if (!entry || typeof entry !== 'object') return null
  const { relationTo, value } = entry as { relationTo?: unknown; value?: unknown }
  if (!value || typeof value !== 'object') return null
  const doc = value as Record<string, unknown>

  if (relationTo === 'accommodations') {
    const hotel = toPublicHotelCard(doc)
    if (!hotel) return null
    return {
      stay: { kind: 'hotel', ...hotel, rating: null },
      mediaSetId: featuredMediaSetId(doc),
    }
  }
  if (relationTo === 'airbnbs') {
    const airbnb = toPublicAirbnbCard(doc)
    if (!airbnb) return null
    return {
      stay: {
        kind: 'airbnb',
        id: airbnb.id,
        title: airbnb.title,
        url: airbnb.listingUrl,
        type: 'Airbnb',
        district: airbnb.area,
        price: null,
        rating: airbnb.rating,
        image: null,
      },
      mediaSetId: galleryMediaSetIds(doc)[0] ?? null,
    }
  }
  return null
}

/**
 * Stay Lists (`hotel-list` blocks) hold hotels and Airbnbs in one ordered
 * relationship; reduce each populated stay to its public row. The routes read
 * with overrideAccess, so an unpublished or deleted stay is left out rather
 * than leaked, as the Hotel and Airbnb Cards do. Each row's featured photo is
 * batch-resolved in one query.
 */
export async function sanitizeStayLists(
  blocks: Array<Record<string, unknown>>,
  payload?: Payload,
): Promise<void> {
  const pending: Array<{ stay: PublicStay; mediaSetId: number }> = []

  for (const block of blocks) {
    if (block.blockType !== 'hotel-list') continue
    const entries = Array.isArray(block.stays) ? block.stays : []
    block.stays = entries.flatMap((entry) => {
      const result = toStay(entry)
      if (!result) return []
      if (result.mediaSetId !== null) pending.push({ stay: result.stay, mediaSetId: result.mediaSetId })
      return [result.stay]
    })
    block.label = typeof block.label === 'string' && block.label.trim() ? block.label.trim() : null
  }

  if (!payload || pending.length === 0) return

  const resolvedById = await resolveWideCardImages(
    payload,
    pending.map((entry) => entry.mediaSetId),
  )
  for (const { stay, mediaSetId } of pending) {
    const resolved = resolvedById.get(mediaSetId)
    if (resolved) stay.image = { ...resolved, alt: resolved.alt || stay.title }
  }
}
