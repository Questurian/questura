/**
 * The Worker's entry: the adapter's Worker, then Google's full-text view of
 * Gated items on the way out (ADR-0009, src/lib/crawler-view/crawlerView.ts).
 *
 * Off unless the Worker secret QUESTURA_CRAWLER_BODY_KEY is set, and the API
 * holds the same value. Delete it on either side to switch the view off.
 */
import openNext from '../.open-next/worker.js'
import { applyCrawlerView, withoutValidators } from '../src/lib/crawler-view/crawlerView.ts'
import googlebot from './googlebot-ranges.json'

// The Durable Object classes wrangler.jsonc binds.
export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from '../.open-next/worker.js'

const PREFIXES = googlebot.prefixes.map((entry) => entry.ipv4Prefix ?? entry.ipv6Prefix)
const BODY_TIMEOUT_MS = 5000

async function loadBody(env, path, key) {
  const headers = { 'content-type': 'application/json', 'x-questura-crawler-key': key }
  if (env.ORIGIN_AUTH_SECRET) headers['x-questura-origin-auth'] = env.ORIGIN_AUTH_SECRET

  // A POST, so no cache between here and the API may store the answer.
  const response = await fetch(`${env.NEXT_PUBLIC_BACKEND_URL}/api/internal/crawler-body`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ path }),
    redirect: 'manual',
    signal: AbortSignal.timeout(BODY_TIMEOUT_MS),
  })
  if (response.status !== 200) return null

  const { html } = await response.json()
  return typeof html === 'string' ? html : null
}

function rewrite(response, html) {
  let placed = false
  return (
    new HTMLRewriter()
      // The element the page's paywall JSON-LD names by class.
      .on('aside[data-paywalled]', {
        element(element) {
          if (placed) {
            element.remove()
            return
          }
          placed = true
          element.replace(`<section class="paywalled" data-paywalled>${html}</section>`, { html: true })
        },
      })
      // No hydration: React would put the notice back over the text. It also
      // means a crawl loads no billed map and counts as no reader.
      .on('script', {
        element(element) {
          if (element.getAttribute('type') !== 'application/ld+json') element.remove()
        },
      })
      // Photos wait for a script to fade them in, and there are none now.
      .on('img[data-fade]', {
        element(element) {
          element.removeAttribute('data-fade')
        },
      })
      .transform(response)
  )
}

const worker = {
  async fetch(request, env, ctx) {
    const key = env.QUESTURA_CRAWLER_BODY_KEY
    if (!key) return openNext.fetch(request, env, ctx)

    const response = await openNext.fetch(withoutValidators(request, { key, prefixes: PREFIXES }), env, ctx)

    return applyCrawlerView(request, response, {
      prefixes: PREFIXES,
      key,
      loadBody: (path, key) => loadBody(env, path, key),
      rewrite,
    })
  },
}

export default worker
