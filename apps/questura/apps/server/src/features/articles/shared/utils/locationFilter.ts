import type { FilterOptionsProps, Where } from 'payload'
import { getArticleLocationScope } from '@/shared/location/server/articleLocationScope'

/**
 * Single source of truth for the relationship picker filter shared by every
 * article collection (single-type listicles and listicle itineraries).
 *
 * Restricts the picker to published items within the parent article's location
 * scope. The collection slug argument is accepted for call-site readability but
 * is not used — the scope is derived entirely from the parent `location` and
 * `sharedNeighborhoods` on the form.
 *
 * `allowSameCountry` is for itinerary stops, which may sit outside the city on
 * a day trip. Exact selected neighborhoods still limit the picker to them.
 */
export const createLocationFilter = (
  _: string,
  options: { allowSameCountry?: boolean } = {},
) => {
  return async ({ data, req }: FilterOptionsProps): Promise<Where> => {
    const parentLocation = data?.location as string | undefined
    const sharedNeighborhoods = data?.sharedNeighborhoods

    if (!parentLocation) {
      return {
        status: { equals: 'published' },
      } satisfies Where
    }

    const scope = await getArticleLocationScope(req.payload, {
      location: parentLocation,
      sharedNeighborhoods,
    })

    if (!scope.keys.length && !scope.refs.length) {
      return {
        and: [{ status: { equals: 'published' } }, { location: { equals: parentLocation } }],
      } satisfies Where
    }

    const locationClauses: Where[] = []

    if (options.allowSameCountry && !scope.exactNeighborhoods) {
      locationClauses.push({
        location: {
          contains: parentLocation.split('|')[0],
        },
      })
    } else if (scope.keys.length) {
      locationClauses.push({
        location: {
          in: scope.keys,
        },
      })
    }

    if (scope.refs.length) {
      locationClauses.push({
        locationRef: {
          in: scope.refs,
        },
      })
    }

    return {
      and: [{ status: { equals: 'published' } }, { or: locationClauses }],
    } satisfies Where
  }
}
