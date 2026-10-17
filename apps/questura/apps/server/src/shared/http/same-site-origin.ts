/**
 * Refuses a state-changing request sent from another address on our own site
 * (a sibling subdomain such as ads.questurian.com) that is not one of the
 * site's allowed origins.
 *
 * Why only same-site. The session cookies are `SameSite=Lax`, so a browser
 * already leaves them off a POST that starts on another site. A sibling
 * subdomain is the *same* site, so they ride along -- and a subdomain can end
 * up running third-party code (ads.questurian.com served Adsterra banners on
 * 2026-10-17). CORS stops that code from reading the answer, not the API from
 * acting on the request, so the refusal has to happen at the door. Kept after
 * that subdomain went: it costs nothing and covers the next one.
 *
 * Allowed through: safe methods, requests with no `Origin` (servers, webhooks),
 * `Origin: null` (an opaque-origin document, which browsers treat as
 * cross-site, so it carries no Lax cookie), the configured origins, the API's
 * own origin (the Payload admin), and every other site (cross-site: no Lax
 * cookie).
 *
 * "Site" here is the last two labels of the host, which is right for
 * questurian.com and localhost and would be wrong under a two-label public
 * suffix such as .co.uk.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function hostnameOf(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return null
  }
}

/** `ads.questurian.com` and `www.questurian.com` → `questurian.com`. */
export function siteOf(hostname: string): string {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  if (/^\d+(\.\d+){3}$/.test(host) || host.includes(':')) return host
  return host.split('.').slice(-2).join('.')
}

export type SameSiteOriginInput = {
  method: string
  /** The request's `Origin` header. */
  origin: string | null
  /** The host the request was sent to (`x-forwarded-host` or `host`), port allowed. */
  host: string | null
  /** The site's allowed origins (`APP_CONFIG.CORS_ORIGINS`). */
  allowedOrigins: readonly string[]
  /** The API's own public origin (`APP_URLS.backend`). */
  selfOrigin: string
}

/** True when the request must be refused. */
export function isForeignSameSiteOrigin(input: SameSiteOriginInput): boolean {
  if (SAFE_METHODS.has(input.method.toUpperCase())) return false
  const origin = input.origin?.trim()
  if (!origin || origin === 'null') return false

  const normalized = origin.replace(/\/+$/, '')
  if (input.allowedOrigins.some((allowed) => allowed.replace(/\/+$/, '') === normalized)) return false
  if (input.selfOrigin.replace(/\/+$/, '') === normalized) return false

  const originHost = hostnameOf(normalized)
  if (!originHost) return false

  const requestHost = input.host?.split(',')[0]?.trim().toLowerCase().replace(/:\d+$/, '') ?? ''
  if (requestHost && originHost === requestHost) return false

  const ourSites = new Set<string>()
  for (const allowed of [...input.allowedOrigins, input.selfOrigin]) {
    const host = hostnameOf(allowed)
    if (host) ourSites.add(siteOf(host))
  }
  if (requestHost) ourSites.add(siteOf(requestHost))

  return ourSites.has(siteOf(originHost))
}
