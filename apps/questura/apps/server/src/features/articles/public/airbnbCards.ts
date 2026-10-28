import type { Payload } from 'payload'

import {
  publicImageAttribution,
  resolveMediaSetForPlacement,
  type PublicImageAttribution,
} from '@/features/media/lib/resolve-public-image'

/** Carries the photo's credit and sources for the credit line under it. */
export type PublicAirbnbCardImage = PublicImageAttribution & {
  url: string
  alt: string
  width: number | null
  height: number | null
}

/**
 * How many of an Airbnb's photos a card shows (owner decision, 2026-10-20).
 * The record holds up to 20; the box's gallery steps through the first seven,
 * in the order Location Manager saved them.
 */
export const AIRBNB_CARD_PHOTO_LIMIT = 7

export type PublicAirbnbCard = {
  id: number
  title: string
  listingUrl: string
  stayType: string | null
  near: string | null
  description: string | null
  price: string | null
  rating: number | null
  reviewCount: number | null
  /** The neighbourhood the Airbnb is tagged with, for example "Miraflores". */
  area: string | null
  /** The gallery's first photos, featured first. Empty when none resolve. */
  images: PublicAirbnbCardImage[]
  /**
   * The featured photo, `images[0]`. Kept for a client still on the one-photo
   * card while a deploy rolls out (the API ships before the Worker).
   */
  image: PublicAirbnbCardImage | null
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null

const finiteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

function relationId(ref: unknown): number | null {
  if (typeof ref === 'number') return ref
  if (ref && typeof ref === 'object' && 'id' in ref) {
    const id = (ref as { id: unknown }).id
    if (typeof id === 'number') return id
  }
  return null
}

/** The gallery's media-set ids in order, each once; rows arrive as ids or shallow docs. */
export function galleryMediaSetIds(airbnb: Record<string, unknown>): number[] {
  const gallery = airbnb.gallery
  if (!Array.isArray(gallery)) return []
  const ids: number[] = []
  for (const row of gallery) {
    if (!row || typeof row !== 'object') continue
    const id = relationId((row as { image?: unknown }).image)
    if (id !== null && !ids.includes(id)) ids.push(id)
  }
  return ids
}

/** `locationRef` is populated at the article's fetch depth; a bare id names nothing. */
function areaName(locationRef: unknown): string | null {
  if (!locationRef || typeof locationRef !== 'object') return null
  const location = locationRef as Record<string, unknown>
  return text(location.neighborhoodName) ?? text(location.cityName)
}

export function toPublicAirbnbCard(airbnb: Record<string, unknown>): PublicAirbnbCard | null {
  if (airbnb.status !== 'published') return null
  const id = relationId(airbnb)
  const title = text(airbnb.title)
  const listingUrl = text(airbnb.listingUrl)
  if (id === null || !title || !listingUrl) return null

  return {
    id,
    title,
    listingUrl,
    stayType: text(airbnb.stayType),
    near: text(airbnb.near),
    description: text(airbnb.description),
    price: text(airbnb.price),
    rating: finiteNumber(airbnb.rating),
    reviewCount: finiteNumber(airbnb.reviewCount),
    area: areaName(airbnb.locationRef),
    images: [],
    image: null,
  }
}

/**
 * Airbnb Card blocks hold a relationship; reduce each populated Airbnb to the
 * public card shape. The routes read with overrideAccess, so an unpublished or
 * deleted Airbnb would otherwise leak; it becomes `airbnb: null` and the site
 * skips the card. The gallery photos sit past the article fetch depth, so the
 * first `AIRBNB_CARD_PHOTO_LIMIT` of every card are batch-resolved in one
 * query, the same way Tour Picks resolve theirs. A photo that has no wide crop
 * is left out rather than shown at the wrong shape.
 */
export async function sanitizeAirbnbCards(
  blocks: Array<Record<string, unknown>>,
  payload?: Payload,
): Promise<void> {
  const pending: Array<{ card: PublicAirbnbCard; mediaSetIds: number[] }> = []

  for (const block of blocks) {
    if (block.blockType !== 'airbnb-card') continue
    const airbnb = block.airbnb
    const card =
      airbnb && typeof airbnb === 'object'
        ? toPublicAirbnbCard(airbnb as Record<string, unknown>)
        : null
    block.airbnb = card
    if (!card) continue
    const mediaSetIds = galleryMediaSetIds(airbnb as Record<string, unknown>).slice(
      0,
      AIRBNB_CARD_PHOTO_LIMIT,
    )
    if (mediaSetIds.length > 0) pending.push({ card, mediaSetIds })
  }

  if (!payload || pending.length === 0) return

  const uniqueIds = [...new Set(pending.flatMap((entry) => entry.mediaSetIds))]
  const mediaSets = await payload.find({
    collection: 'media-sets',
    where: { id: { in: uniqueIds } },
    depth: 1,
    limit: uniqueIds.length,
    overrideAccess: true,
  })

  const resolvedById = new Map<number, PublicAirbnbCardImage>()
  for (const doc of mediaSets.docs as unknown as Array<Record<string, unknown>>) {
    if (typeof doc.id !== 'number') continue
    const resolved = resolveMediaSetForPlacement(doc, 'wide-card', {
      allowMigrationFallback: true,
      includeAttribution: true,
    })
    if (!resolved.url) continue
    resolvedById.set(doc.id, {
      url: resolved.url,
      alt: resolved.alt,
      width: resolved.width,
      height: resolved.height,
      ...publicImageAttribution(resolved),
    })
  }

  for (const { card, mediaSetIds } of pending) {
    card.images = mediaSetIds.flatMap((mediaSetId, index) => {
      const resolved = resolvedById.get(mediaSetId)
      if (!resolved) return []
      // The featured photo stands for the stay; the rest are numbered so a
      // screen reader can tell them apart when no alt text was written.
      const fallbackAlt = index === 0 ? card.title : `${card.title}, photo ${index + 1}`
      return [{ ...resolved, alt: resolved.alt || fallbackAlt }]
    })
    card.image = card.images[0] ?? null
  }
}
