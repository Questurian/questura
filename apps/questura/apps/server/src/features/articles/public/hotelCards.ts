import type { Payload } from 'payload'

import { resolveMediaSetForPlacement } from '@/features/media/lib/resolve-public-image'

export type PublicHotelCardImage = {
  url: string
  alt: string
  width: number | null
  height: number | null
}

export type PublicHotelCard = {
  id: number
  title: string
  url: string | null
  type: string | null
  district: string | null
  price: string | null
  image: PublicHotelCardImage | null
}

const TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  hostel: 'Hostel',
  resort: 'Resort',
  'vacation-rental': 'Vacation Rental',
  villa: 'Villa',
  guesthouse: 'Guesthouse',
  boutique: 'Boutique Hotel',
  budget: 'Budget Hotel',
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null

const group = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

function relationId(ref: unknown): number | null {
  if (typeof ref === 'number') return ref
  if (ref && typeof ref === 'object' && 'id' in ref) {
    const id = (ref as { id: unknown }).id
    if (typeof id === 'number') return id
  }
  return null
}

/** Editors paste links as bare hostnames as often as full URLs; anything that is not http(s) after that is dropped. */
function httpUrl(value: unknown): string | null {
  const raw = text(value)
  if (!raw) return null
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`
  try {
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

/** Price tiers are stored '1'-'4'; rows synced from Location Manager may still hold dollar ticks. */
function priceTicks(value: unknown): string | null {
  const raw = text(value)
  if (!raw) return null
  if (/^\${1,4}$/.test(raw)) return raw
  return /^[1-4]$/.test(raw) ? '$'.repeat(Number(raw)) : null
}

/** The featured photo is the first gallery row; it arrives as an id or a shallow doc. */
function featuredMediaSetId(hotel: Record<string, unknown>): number | null {
  const gallery = hotel.gallery
  if (!Array.isArray(gallery) || gallery.length === 0) return null
  const first = gallery[0]
  if (!first || typeof first !== 'object') return null
  return relationId((first as { image?: unknown }).image)
}

function toPublicCard(hotel: Record<string, unknown>): PublicHotelCard | null {
  if (hotel.status !== 'published') return null
  const id = relationId(hotel)
  const title = text(hotel.title)
  if (id === null || !title) return null

  const core = group(hotel.core)
  const details = group(hotel.theDetails)
  const type = text(hotel.type)

  return {
    id,
    title,
    url:
      httpUrl(details.bookingUrl) ??
      httpUrl(details.websiteUrl) ??
      httpUrl(hotel.website) ??
      httpUrl(details.googleMapsUrl) ??
      httpUrl(hotel.address),
    type: (type && TYPE_LABELS[type]) ?? text(core.type),
    district: text(core.district),
    price: priceTicks(hotel.priceLevel) ?? priceTicks(core.price),
    image: null,
  }
}

/**
 * Hotel Card blocks hold a relationship to an accommodation; reduce each
 * populated one to the public card shape. The routes read with overrideAccess,
 * so an unpublished or deleted accommodation would otherwise leak, along with
 * contact fields the card never shows; it becomes `hotel: null` and the site
 * skips the card. The featured photo sits past the article fetch depth, so its
 * variants are batch-resolved, the same way Airbnb Cards resolve theirs.
 */
export async function sanitizeHotelCards(
  blocks: Array<Record<string, unknown>>,
  payload?: Payload,
): Promise<void> {
  const pending: Array<{ card: PublicHotelCard; mediaSetId: number }> = []

  for (const block of blocks) {
    if (block.blockType !== 'hotel-card') continue
    const hotel = block.hotel
    const card =
      hotel && typeof hotel === 'object' ? toPublicCard(hotel as Record<string, unknown>) : null
    block.hotel = card
    if (!card) continue
    const mediaSetId = featuredMediaSetId(hotel as Record<string, unknown>)
    if (mediaSetId !== null) pending.push({ card, mediaSetId })
  }

  if (!payload || pending.length === 0) return

  const uniqueIds = [...new Set(pending.map((entry) => entry.mediaSetId))]
  const mediaSets = await payload.find({
    collection: 'media-sets',
    where: { id: { in: uniqueIds } },
    depth: 1,
    limit: uniqueIds.length,
    overrideAccess: true,
  })

  const resolvedById = new Map<number, PublicHotelCardImage>()
  for (const doc of mediaSets.docs as unknown as Array<Record<string, unknown>>) {
    if (typeof doc.id !== 'number') continue
    const resolved = resolveMediaSetForPlacement(doc, 'wide-card', {
      allowMigrationFallback: true,
    })
    if (!resolved.url) continue
    resolvedById.set(doc.id, {
      url: resolved.url,
      alt: resolved.alt,
      width: resolved.width,
      height: resolved.height,
    })
  }

  for (const { card, mediaSetId } of pending) {
    const resolved = resolvedById.get(mediaSetId)
    if (resolved) card.image = { ...resolved, alt: resolved.alt || card.title }
  }
}
