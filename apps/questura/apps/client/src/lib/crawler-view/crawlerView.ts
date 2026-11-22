import { isVerifiedGooglebot } from './googlebot.ts'

/**
 * Google's full-text view of a Gated item (ADR-0009, revised 2026-11-21).
 *
 * Runs in the Worker's own entry (`cloudflare/worker.js`), on the response
 * Next has already finished. That position is the safety property: every
 * cache (R2, the regional copy, the tag cache, Next's data cache) sits
 * upstream, holds only the Free sample, and cannot see what is added here.
 *
 * Never move this into a page, a layout, middleware or a fetch made during a
 * render. Those outputs are stored and shared.
 */

/** The switch: with no key of at least this length, nothing here runs. */
export const MIN_CRAWLER_KEY_LENGTH = 32

export type CrawlerViewDeps = {
  prefixes: readonly string[]
  key: string | undefined
  /** The paid body as HTML, or null for "not a published Gated item". */
  loadBody: (path: string, key: string) => Promise<string | null>
  rewrite: (response: Response, html: string) => Response
}

const SEGMENT = '[a-z0-9-]+'
const ITEM_PATH = new RegExp(`^/(?:articles/${SEGMENT}|${SEGMENT}/${SEGMENT}/${SEGMENT}/${SEGMENT})$`)

function wantsFullText(request: Request, response: Response, deps: CrawlerViewDeps): string | null {
  if (!deps.key || deps.key.length < MIN_CRAWLER_KEY_LENGTH) return null
  if (request.method !== 'GET' || response.status !== 200) return null
  if (!response.headers.get('content-type')?.startsWith('text/html')) return null
  // Another Worker's subrequest can be given headers by whoever wrote it.
  if (request.headers.has('cf-worker') || request.headers.has('rsc')) return null

  const url = new URL(request.url)
  if (url.searchParams.has('_rsc') || !ITEM_PATH.test(url.pathname)) return null

  // Cloudflare writes cf-connecting-ip itself. No other address header counts.
  const caller = { ip: request.headers.get('cf-connecting-ip'), userAgent: request.headers.get('user-agent') }
  return isVerifiedGooglebot(caller, deps.prefixes) ? url.pathname : null
}

function neverStored(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const name of ['cache-tag', 'etag', 'last-modified', 'content-length', 'age', 'expires', 'x-nextjs-cache']) {
    headers.delete(name)
  }
  headers.set('cache-control', 'private, no-store, max-age=0')
  headers.set('cdn-cache-control', 'no-store')
  headers.set('cloudflare-cdn-cache-control', 'no-store')
  // No cached copy for searchers to open, and no long run of paid text quoted
  // in a result or an AI answer.
  headers.set('x-robots-tag', 'noarchive, max-snippet:300')
  return new Response(response.body, { status: response.status, headers })
}

export async function applyCrawlerView(request: Request, response: Response, deps: CrawlerViewDeps): Promise<Response> {
  try {
    const path = wantsFullText(request, response, deps)
    if (!path) return response

    const html = await deps.loadBody(path, deps.key as string)
    if (!html) return response

    return deps.rewrite(neverStored(response), html)
  } catch {
    // Any doubt is the preview. Nothing is logged: the error could carry body.
    return response
  }
}
