import { config } from '@/lib/config'
import { renderHeaders } from '@/lib/cache/public-cache'
import { LIMA_HREF, PERU_LAUNCH_ENABLED } from '@/lib/routing/peruLaunch'

export type LocationMenuCity = {
  locationKey: string
  label: string
  href: string
}

export type LocationMenuCountry = {
  locationKey: string
  label: string
  /** ISO 3166-1 alpha-2, uppercase. Null when the server could not match a country. */
  countryCode: string | null
  href: string
  cities: LocationMenuCity[]
}

export type LocationMenuResponse = {
  countries: LocationMenuCountry[]
}

export function visibleLocationMenu(menu: LocationMenuResponse): LocationMenuResponse {
  if (!PERU_LAUNCH_ENABLED) return menu
  return {
    countries: menu.countries.filter((country) => country.locationKey === 'peru').map((country) => ({
      ...country,
      href: '/',
      cities: country.cities.filter((city) => city.href === LIMA_HREF),
    })),
  }
}

export async function fetchLocationMenu(): Promise<LocationMenuResponse> {
  const url = `${config.backendUrl}/api/public/locations/menu`
  const res = await fetch(url, {
    headers: { Accept: 'application/json', ...renderHeaders() },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch location menu: ${res.status}`)
  }

  return visibleLocationMenu(await res.json() as LocationMenuResponse)
}
