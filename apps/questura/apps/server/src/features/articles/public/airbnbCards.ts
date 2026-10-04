import type { Payload } from 'payload'

import { resolveMediaSetForPlacement } from '@/features/media/lib/resolve-public-image'

export type PublicAirbnbCardImage = {
  url: string
  alt: string
  width: number | null
  height: number | null
}

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

/** The featured photo is the first gallery row; it arrives as an id or a shallow doc. */
function featuredMediaSetId(airbnb: Record<string, unknown>): number | null {
  const gallery = airbnb.gallery
  if (!Array.isArray(gallery) || gallery.length === 0) return null
  const first = gallery[0]
  if (!first || typeof first !== 'object') return null
  return relationId((first as { image?: unknown }).image)
}

function toPublicCard(airbnb: Record<string, unknown>): PublicAirbnbCard | null {
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
    image: null,
  }
}

/**
 * Airbnb Card blocks hold a relationship; reduce each populated Airbnb to the
 * public card shape. The routes read with overrideAccess, so an unpublished or
 * deleted Airbnb would otherwise leak; it becomes `airbnb: null` and the site
 * skips the card. The featured photo sits past the article fetch depth, so its
 * variants are batch-resolved, the same way Tour Picks resolve theirs.
 */
export async function sanitizeAirbnbCards(
  blocks: Array<Record<string, unknown>>,
  payload?: Payload,
): Promise<void> {
  const pending: Array<{ card: PublicAirbnbCard; mediaSetId: number }> = []

  for (const block of blocks) {
    if (block.blockType !== 'airbnb-card') continue
    const airbnb = block.airbnb
    const card =
      airbnb && typeof airbnb === 'object'
        ? toPublicCard(airbnb as Record<string, unknown>)
        : null
    block.airbnb = card
    if (!card) continue
    const mediaSetId = featuredMediaSetId(airbnb as Record<string, unknown>)
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

  const resolvedById = new Map<number, PublicAirbnbCardImage>()
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
