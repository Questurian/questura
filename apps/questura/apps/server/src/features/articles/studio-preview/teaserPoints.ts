import { gatePublicArticle } from '@/features/articles/public/gatePublicArticle'
import type { ArticleCollectionSlug } from '@/features/articles/public/serializeArticleBlocks'

export type TeaserPoint = { lat: number; lng: number }

function coordinatesOf(value: unknown): TeaserPoint | null {
  if (!value || typeof value !== 'object') return null
  const { latitude, longitude } = value as { latitude?: unknown; longitude?: unknown }
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return { lat: latitude, lng: longitude }
}

const rowsOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

/**
 * Every dot a non-member's map would draw for this guide, so the studio can
 * frame the saved map picture around exactly those (shared/content/mapTeaser.ts).
 *
 * Gates a copy as if the guide were members-only, whatever its tier: the
 * places the free sample keeps, at their real positions; the withheld ones at
 * the rough positions the page gets (freeSample.ts), which can sit a few
 * hundred metres from the real door; and an itinerary's lodging. A guide
 * framed on its exact positions alone could leave a rough dot off the picture,
 * and then the page shows the plain drawing instead.
 *
 * May include a dot the page skips (an activity add-on on its place's pin):
 * one extra dot on top of another changes no framing.
 */
export function teaserPointsFor(collection: ArticleCollectionSlug, serializedDoc: Record<string, unknown>): TeaserPoint[] {
  const copy = JSON.parse(JSON.stringify(serializedDoc)) as Record<string, unknown>
  copy.access = 'member'
  const gate = gatePublicArticle(collection, copy)

  const points: TeaserPoint[] = []
  for (const row of rowsOf(copy.items)) {
    const at = coordinatesOf((row as { item?: unknown } | null)?.item)
    if (at) points.push(at)
  }
  for (const pin of gate.mapPins ?? []) points.push({ lat: pin.lat, lng: pin.lng })
  for (const row of rowsOf(copy.whereStaying)) {
    const at = coordinatesOf((row as { item?: unknown } | null)?.item)
    if (at) points.push(at)
  }
  return points
}
