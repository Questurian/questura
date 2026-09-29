import { getPublicBaseUrl } from './publicBaseUrl'

const PUBLIC_BASE_URL = getPublicBaseUrl()

/**
 * Official Questura social profiles for the Organization `sameAs` links.
 * Add profile URLs here as they exist; `sameAs` is omitted while empty.
 */
const SOCIAL_PROFILE_URLS: string[] = []

export function buildOrganizationJsonLd(): Record<string, unknown> {
  const base = PUBLIC_BASE_URL.replace(/\/+$/, '')

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${base}/#organization`,
    name: 'Questurian',
    url: `${base}/`,
    // app/apple-icon.png, served at this path: raster, 180x180, over
    // Google's 112px minimum for a logo.
    logo: `${base}/apple-icon.png`,
    ...(SOCIAL_PROFILE_URLS.length > 0 ? { sameAs: SOCIAL_PROFILE_URLS } : {}),
  }
}
