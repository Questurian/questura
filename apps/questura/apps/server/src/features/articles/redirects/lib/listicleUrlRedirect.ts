import type { CollectionBeforeChangeHook } from 'payload'
import { recordPathRedirect } from './recordPathRedirect'

export type ListiclePageType = 'maps' | 'itineraries'

/**
 * The public address of a published map guide or itinerary, built the same
 * way the sitemap and the site's routes build it: a city guide lives at
 * /country/city/{type}/slug, a country guide at /country/{type}/slug.
 * Anything not published has no public address.
 */
export function listiclePublicPath({
  location,
  slug,
  status,
  type,
}: {
  location: unknown
  slug: unknown
  status: unknown
  type: ListiclePageType
}): string | null {
  if (status !== 'published' || typeof slug !== 'string' || !slug) return null
  const parts = (typeof location === 'string' ? location : '').split('|').filter(Boolean)
  if (parts.length === 0) return `/${type}/${slug}`
  if (parts.length === 1) return `/${parts[0]}/${type}/${slug}`
  return `/${parts[0]}/${parts[1]}/${type}/${slug}`
}

/**
 * When a live map guide or itinerary gets a new web address (slug or place),
 * keep the old address working: it sends readers and search engines on to
 * the new one. Articles do the same in handleCanonicalPathChange.
 */
export function redirectOnListicleUrlChange(type: ListiclePageType): CollectionBeforeChangeHook {
  return async ({ data, originalDoc, req }) => {
    if (!originalDoc || originalDoc.status !== 'published') return data

    const oldPath = listiclePublicPath({
      location: originalDoc.location,
      slug: originalDoc.slug,
      status: originalDoc.status,
      type,
    })
    const newPath = listiclePublicPath({
      location: data?.location !== undefined ? data.location : originalDoc.location,
      slug: data?.slug ?? originalDoc.slug,
      status: data?.status ?? originalDoc.status,
      type,
    })

    if (!oldPath || !newPath || oldPath === newPath) return data

    await recordPathRedirect({
      payload: req.payload,
      oldPath,
      newPath,
      source: type === 'maps' ? 'map-guide-url-change' : 'itinerary-url-change',
    })

    return data
  }
}
