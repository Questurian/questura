/**
 * The one address the site lives on: `https://` + the host of
 * `NEXT_PUBLIC_APP_URL` (www). The Worker also answers on the bare domain and
 * on plain http, but the API trusts only the canonical origin (CORS, Better
 * Auth), so every sign-in and checkout from those addresses failed (issue
 * #728, moving day 2026-09-26). Send them to the canonical address instead.
 *
 * Returns the URL to redirect to, or null when the request is already
 * canonical or the canonical origin is not an https site (local dev).
 */
export function canonicalRedirect(input: {
  appUrl: string | undefined
  host: string | null
  proto: string | null
  pathname: string
  search: string
}): string | null {
  let canonical: URL
  try {
    canonical = new URL(input.appUrl ?? '')
  } catch {
    return null
  }
  if (canonical.protocol !== 'https:') return null

  const host = (input.host ?? '').toLowerCase().split(':')[0]
  const bare = canonical.hostname.replace(/^www\./, '')
  const isCanonicalHost = host === canonical.hostname
  const isBareHost = bare !== canonical.hostname && host === bare
  if (!isCanonicalHost && !isBareHost) return null

  const proto = (input.proto ?? '').toLowerCase().replace(/:$/, '').split(',')[0].trim()
  if (isCanonicalHost && proto !== 'http') return null

  return `${canonical.origin}${input.pathname}${input.search}`
}
