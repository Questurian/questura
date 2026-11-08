import type { Field } from 'payload'

/**
 * The saved map picture a non-member sees on a locked guide or itinerary
 * instead of a billed Google map (client `MapTeaser.tsx`, `lib/mapSnapshot.ts`).
 *
 * The AI Blog Writer draws it from OpenStreetMap tiles when the owner frames
 * the map, uploads the files as media assets, and writes this record on the
 * guide. Before 2026-11-08 the pictures lived in the client's own code
 * (`data/mapTeasers.json`, drawn by `e2e/scripts/render-map-teasers.mjs`);
 * the page still falls back to those for a guide without this field.
 *
 * Shape (the client's `MapSnapshotEntry`): the wide picture, which phones cut
 * their strip from, with the tall one for the desktop column under `tall`.
 * Each picture says the frame it was drawn at so the page can place its own
 * markers over it.
 */
export type MapTeaserPicture = {
  /** The 2x render, and the 1x one for small screens: https CDN addresses. */
  src: string
  srcSmall: string
  /** The frame the picture was drawn at, in CSS px. */
  width: number
  height: number
  center: [lng: number, lat: number]
  zoom: number
}

export type MapTeaser = MapTeaserPicture & {
  tall?: MapTeaserPicture
  /** When the owner took it (ISO). */
  takenAt?: string
  /** The media assets holding the four files, so they can be found again. */
  assetIds?: number[]
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const isHttpsUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

/** Why a value is not a usable picture, or null when it is. */
function pictureProblem(value: unknown, label: string): string | null {
  if (!value || typeof value !== 'object') return `${label} is missing`
  const picture = value as Record<string, unknown>
  if (!isHttpsUrl(picture.src) || !isHttpsUrl(picture.srcSmall)) return `${label} needs https src and srcSmall`
  if (!isFiniteNumber(picture.width) || !isFiniteNumber(picture.height) || picture.width <= 0 || picture.height <= 0) {
    return `${label} needs a positive width and height`
  }
  const center = picture.center
  if (
    !Array.isArray(center) ||
    center.length !== 2 ||
    !isFiniteNumber(center[0]) ||
    !isFiniteNumber(center[1]) ||
    Math.abs(center[0]) > 180 ||
    Math.abs(center[1]) > 90
  ) {
    return `${label} needs a [lng, lat] center`
  }
  if (!isFiniteNumber(picture.zoom) || picture.zoom < 0 || picture.zoom > 22) return `${label} needs a zoom between 0 and 22`
  return null
}

/** Null when the value is empty or a usable map picture; otherwise what is wrong with it. */
export function mapTeaserProblem(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const problem = pictureProblem(value, 'The map picture')
  if (problem) return problem
  const tall = (value as { tall?: unknown }).tall
  if (tall !== undefined && tall !== null) return pictureProblem(tall, 'The tall map picture')
  return null
}

export const mapTeaserField: Field = {
  name: 'mapTeaser',
  label: 'Map picture',
  type: 'json',
  validate: (value: unknown) => mapTeaserProblem(value) ?? true,
  admin: {
    position: 'sidebar',
    readOnly: true,
    description:
      'The OpenStreetMap picture non-members see instead of the Google map. Taken in the AI Blog Writer (Map picture tab); empty means the page uses its built-in picture or the plain drawing.',
  },
}
