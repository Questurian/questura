import { logger } from '@/shared/utils/logger'

/**
 * IndexNow: tell Bing (and the other engines that share IndexNow) that a
 * public page changed, so it is re-crawled in minutes instead of weeks.
 * Bing's index also feeds ChatGPT search and Copilot answers.
 *
 * The key is public by design: the engines check that
 * `https://www.questurian.com/<key>.txt` holds it, which proves we own the
 * host. That file is `apps/client/public/<key>.txt`; the two must match
 * (`submit.test.ts` checks).
 *
 * Only the live site submits. A laptop, a preview or a test run has a
 * different site origin and sends nothing.
 */

export const INDEXNOW_KEY = '402cfe4f4dc60724cb5ec9c681ae8e6c'
export const INDEXNOW_HOST = 'www.questurian.com'
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
const TIMEOUT_MS = 5000
/** IndexNow accepts up to 10,000 URLs per request; we never come close. */
const MAX_URLS = 10_000

function liveSiteOrigin(): string | null {
  const value = process.env.NEXT_PUBLIC_APP_URL
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.host === INDEXNOW_HOST ? url.origin : null
  } catch {
    return null
  }
}

/** Public page paths only: absolute, no API or account routes, no query. */
export function indexNowUrls(paths: readonly string[], origin: string): string[] {
  const urls = new Set<string>()
  for (const path of paths) {
    if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) continue
    if (path.includes('?') || path.includes('#')) continue
    if (/^\/(api|admin|account|auth|studio-preview|purchase|join)(\/|$)/.test(path)) continue
    urls.add(`${origin}${path === '/' ? '/' : path.replace(/\/+$/, '')}`)
  }
  return [...urls].slice(0, MAX_URLS)
}

/**
 * Best effort: never throws, so a slow or refusing search engine can never
 * hold back or fail a page refresh.
 */
export async function submitToIndexNow(
  paths: readonly string[],
  options: { signal?: AbortSignal } = {},
): Promise<'sent' | 'skipped' | 'failed'> {
  const origin = liveSiteOrigin()
  if (!origin) return 'skipped'
  const urlList = indexNowUrls(paths, origin)
  if (urlList.length === 0) return 'skipped'

  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: INDEXNOW_HOST,
        key: INDEXNOW_KEY,
        keyLocation: `${origin}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
      signal,
    })
    // 200 = received, 202 = received and the key check is still pending.
    if (response.ok) return 'sent'
    logger.warn(`[indexnow] ${response.status} for ${urlList.length} url(s)`)
    return 'failed'
  } catch (error) {
    logger.warn(`[indexnow] request failed: ${error instanceof Error ? error.message : String(error)}`)
    return 'failed'
  }
}
