import { consentRequiredFor } from './adConsent.ts'
import { adFrameDocument } from './adFrameDocument.ts'
import { ADSTERRA_SCRIPT_ORIGIN, AD_UNIT_SIZES } from './adUnits.ts'

/**
 * What `ads.questurian.com` answers: the one document a banner runs in, and
 * whether a visitor must be asked before ads load (`/region`, see
 * `adConsent.ts`). Nothing else (the `questura-ad-frame` Worker,
 * `ad-frame/worker.ts`).
 *
 * Why a separate address. Adsterra's script needs storage and cookies of its
 * own, so it fails in a sandboxed frame with no origin (checked 2026-10-17:
 * "Script error.", no ad). On its own origin the frame can keep
 * `allow-same-origin` -- that origin is ads.questurian.com, not the site -- and
 * the ad still cannot read a page, the site's storage or the reader's session.
 * Same-site requests it could send to the API are refused there
 * (`apps/server/src/shared/http/same-site-origin.ts`).
 *
 * Only the four sizes the site uses, and only a well-formed unit key: the
 * address cannot be borrowed to run some other script. Only the site may frame
 * it (`frame-ancestors`); localhost is there so `pnpm dev` shows real ads.
 *
 * Dependency-free so node:test can import it.
 */

export const AD_FRAME_PATH = '/frame'
export const AD_REGION_PATH = '/region'

const SITE_ORIGINS = ['https://www.questurian.com', 'https://questurian.com', 'http://localhost:3000']
const FRAME_ANCESTORS = SITE_ORIGINS.join(' ')

/** Cloudflare's lookup of where the request came from (`request.cf.country`). */
export type VisitorCountry = string | null | undefined

/**
 * `{ consentRequired }` for this visitor. Per visitor, so never cached, and
 * readable only by the site. Development can force an answer with
 * `?country=FR`, which only ever makes the site ask more.
 */
function regionResponse(request: Request, url: URL, country: VisitorCountry): Response {
  const origin = request.headers.get('origin')
  const forced = url.searchParams.get('country')
  const body = JSON.stringify({ consentRequired: consentRequiredFor(forced ?? country) })
  const headers: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'private, no-store',
    vary: 'Origin',
    'x-content-type-options': 'nosniff',
  }
  if (origin && SITE_ORIGINS.includes(origin)) headers['access-control-allow-origin'] = origin
  return new Response(request.method === 'HEAD' ? null : body, { status: 200, headers })
}

const KEY_PATTERN = /^[a-z0-9]{16,64}$/i

function plain(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=300',
      'x-content-type-options': 'nosniff',
    },
  })
}

export function adFrameResponse(request: Request, country?: VisitorCountry): Response {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } })
  }

  const url = new URL(request.url)
  if (url.pathname === AD_REGION_PATH) return regionResponse(request, url, country)
  if (url.pathname !== AD_FRAME_PATH) return plain(404, 'Not Found')

  const key = url.searchParams.get('k') ?? ''
  const width = Number(url.searchParams.get('w'))
  const height = Number(url.searchParams.get('h'))
  const knownSize = Object.values(AD_UNIT_SIZES).some(
    (size) => size.width === width && size.height === height,
  )
  if (!KEY_PATTERN.test(key) || !knownSize) return plain(400, 'Bad Request')

  const html = adFrameDocument({ key, width, height }, ADSTERRA_SCRIPT_ORIGIN)
  return new Response(request.method === 'HEAD' ? null : html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': `frame-ancestors ${FRAME_ANCESTORS}`,
      // `no-transform` keeps Cloudflare from injecting its Web Analytics
      // beacon: every ad on a page would otherwise count as a page view.
      'cache-control': 'public, max-age=3600, no-transform',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
    },
  })
}
