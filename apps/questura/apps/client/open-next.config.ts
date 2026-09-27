/**
 * OpenNext adapter configuration for Questura Client (ADR-0014).
 *
 * The four components are not a menu. Questura invalidates on demand
 * (ADR-0003, docs/capacity/cache-contract.md): the backend's refresh outbox
 * calls POST /api/revalidate, which calls revalidateTag and revalidatePath.
 * Without the tag cache those calls resolve to nothing, and without cache
 * purge they update the incremental cache while the CDN keeps serving the old
 * page. Either way the queue drains clean and the site stays stale — which is
 * exactly the failure L01 spent its time removing from the backend, so
 * reintroducing it in the adapter would waste that work.
 *
 * Cache purge is configured by binding (NEXT_CACHE_DO_PURGE) plus the
 * CACHE_PURGE_API_TOKEN and CACHE_PURGE_ZONE_ID secrets; see wrangler.jsonc.
 */

import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache'
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache'
import d1NextTagCache from '@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache'
import doQueue from '@opennextjs/cloudflare/overrides/queue/do-queue'
// `/index` is not a typo. The package's export map is `./*` →
// `./dist/api/*.js`, and cache-purge is a directory rather than a file, so
// the bare specifier resolves to a path that does not exist.
import { purgeCache } from '@opennextjs/cloudflare/overrides/cache-purge/index'

/**
 * Rendered pages get a copy in each data centre's Cache API; data fetched
 * while rendering does not. A hit skips the R2 read. It does NOT skip the tag
 * check (D1), and must not.
 *
 * The adapter's default with cache purge on is to skip the tag check on a
 * regional hit and rely on the purge. Live on 2026-09-27 that left a
 * revalidated page stuck: a regional miss reads the old entry from R2 and
 * writes it into the regional cache in the background; the interceptor sees
 * the tag and hands the request to Next; Next's own read then hits that fresh
 * regional copy, skips the tags, and serves the old page as a HIT without
 * rebuilding. Every later purge repeats the same loop. With the tag check on,
 * an old copy is found stale wherever it sits, and the purge only saves a
 * rebuild per data centre.
 *
 * `shouldLazilyUpdateOnCacheHit` refreshes the regional copy from R2 in the
 * background after each hit, so a data centre that did not do a time-based
 * rebuild itself still picks up the new page instead of serving its old copy
 * until the Cache API expires it.
 *
 * Fetched data stays on R2: a rebuild must read it through the normal path,
 * and the regional cache adds nothing there that is worth another copy to
 * keep in step.
 */
const regionalPages = withRegionalCache(r2IncrementalCache, {
  mode: 'long-lived',
  bypassTagCacheOnCacheHit: false,
  shouldLazilyUpdateOnCacheHit: true,
})

const incrementalCache: Pick<typeof r2IncrementalCache, 'name' | 'get' | 'set' | 'delete'> = {
  name: r2IncrementalCache.name,
  get: (key, cacheType) =>
    cacheType === 'fetch' ? r2IncrementalCache.get(key, cacheType) : regionalPages.get(key, cacheType),
  set: (key, value, cacheType) =>
    cacheType === 'fetch' ? r2IncrementalCache.set(key, value, cacheType) : regionalPages.set(key, value, cacheType),
  // The regional delete removes the R2 entry as well as this data centre's copy.
  delete: (key) => regionalPages.delete(key),
}

export default defineCloudflareConfig({
  incrementalCache,
  tagCache: d1NextTagCache,
  queue: doQueue,
  // The component that actually evicts the CDN. Declaring the
  // NEXT_CACHE_DO_PURGE binding without wiring this override is the
  // half-configured state that looks fine and leaves the site stale:
  // revalidateTag updates the incremental cache and the edge keeps serving
  // the old page.
  cachePurge: purgeCache({ type: 'durableObject' }),
  // Serves a cached page before the Next server runs. It is on because of
  // what the live site showed (2026-09-27): Next judges a page's age by the
  // prerender manifest, and a page missing from it (the index pages, which
  // have no generateStaticParams, and anything published after the build)
  // counts as stale one second after it is written. A fresh isolate has no
  // memory of the real revalidate, so those pages re-rendered on nearly
  // every visit. The interceptor reads `revalidate` from the cache entry
  // itself, so they get their hour.
  //
  // It serves the same bytes the server would: every public page is
  // force-static, the navbar's auth slot and member bodies load in the
  // browser, nothing public reads cookies or headers, and there are no
  // intercepting or parallel routes (the interceptor ignores Next-Url).
  // Middleware and next.config headers still run first.
  enableCacheInterception: true,
})
