/**
 * The city a map or itinerary lives in, read off its public path
 * (`/<country>/<city>/maps/<slug>`). Teasers carry no location name, and the
 * slug is the same name the navbar's city menu shows (it title-cases it too).
 *
 * Null for anything else: standard articles route by category and may be
 * worldwide, so their path says nothing reliable about a city.
 *
 * Dependency-free so the client's node:test suite can run it.
 */
const CITY_ROUTE_KINDS = new Set(['maps', 'itineraries'])

export function cityLabelFromArticlePath(path: string | null | undefined): string | null {
  if (!path) return null
  const parts = path.split('?')[0].split('/').filter(Boolean)
  if (parts.length !== 4 || !CITY_ROUTE_KINDS.has(parts[2])) return null

  return parts[1]
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
