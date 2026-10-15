import type { ListicleItemRow } from '@/features/articles/types/mapsListicle'
import { isListicleVenue } from '@/features/articles/types/mapsListicle'
import { photoCredit, type PhotoCredit } from './photoCredit'

export type ListicleItemImage = {
  url: string
  alt: string
  credit: PhotoCredit
}

/** Images for a listicle row from editor-selected photos (public API depth). */
export function listicleItemImagesFromRow(row: ListicleItemRow): ListicleItemImage[] {
  const photos = row.selectedPhotos
  if (!Array.isArray(photos) || photos.length === 0) {
    return []
  }

  return photos.flatMap((photo) => {
    const variants = photo.variants
    const variant = [variants?.wide, variants?.editorial, variants?.hero, variants?.square].find(
      (candidate) => candidate?.url,
    )
    const url = variant?.url ?? photo.url

    if (!url) return []

    const alt =
      typeof photo.alt_text === 'string'
        ? photo.alt_text
        : isListicleVenue(row.item)
          ? row.item.title
          : ''

    return [{ url, alt, credit: photoCredit(photo, variant) }]
  })
}

/** First image retained for callers that only need a thumbnail. */
export function listicleItemHeroFromRow(row: ListicleItemRow): ListicleItemImage | null {
  return listicleItemImagesFromRow(row)[0] ?? null
}

/** Human-readable price tiers shared by stay and dining cards (index = level - 1). */
export const PRICE_TIER_LABELS = ['Budget', 'Moderate', 'Upscale', 'Luxury'] as const

/** Descriptor for a 1-4 price level, e.g. 3 -> "Upscale". */
export function priceTierDescriptor(priceLevel?: number | null): string | undefined {
  if (!priceLevel || priceLevel < 1) {
    return undefined
  }
  return PRICE_TIER_LABELS[Math.min(priceLevel, PRICE_TIER_LABELS.length) - 1]
}

export function priceLevelLabel(priceLevel?: string | null): string | null {
  if (!priceLevel) {
    return null
  }
  const n = parseInt(priceLevel, 10)
  if (!Number.isFinite(n) || n < 1) {
    return null
  }
  return '$'.repeat(Math.min(n, 4))
}

export function formatVenueKind(type?: string | null): string {
  if (!type) {
    return 'Spot'
  }
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
}
