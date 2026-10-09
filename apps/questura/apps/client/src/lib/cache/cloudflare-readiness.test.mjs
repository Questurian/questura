import assert from 'node:assert/strict'
import { readdirSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const clientRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const pkg = JSON.parse(readFileSync(resolve(clientRoot, 'package.json'), 'utf8'))
const read = (name) => readFileSync(resolve(clientRoot, name), 'utf8')

/**
 * The adapter is installed and the Worker has been built and previewed
 * (docs/capacity/runs/2026-09-22-L09-cloudflare-adapter.md). These guard the
 * three things about that setup which would break silently.
 */

// `@opennextjs/cloudflare@1.18.1` declares `next: ~15.4.11 || ~15.5.10 || ...`,
// and the client is on 15.5.27. Later adapters move the floor (1.19.0 wants
// >=15.5.15, 1.20.6 wants >=15.5.24 <16 || >=16.3.3). A caret on either side of
// the pair lets a routine install cross a boundary with no error until the
// build fails.
test('the adapter and Next are pinned to a compatible pair', () => {
  assert.equal(pkg.dependencies.next, '15.5.27')
  assert.equal(
    pkg.devDependencies['@opennextjs/cloudflare'],
    '1.18.1',
    'Exact, not caret: each adapter release moves its Next range. Check its peerDependencies against the pinned Next before moving it.',
  )
  assert.equal(pkg.devDependencies.wrangler, '4.136.2')
})

// Questura publishes by on-demand invalidation (ADR-0003). Without the tag
// cache, revalidateTag resolves to nothing; without cache purge it updates
// the incremental cache while the edge keeps serving the old page. Either way
// the backend's queue drains clean and the site stays stale.
test('all four cache components are configured, not just bound', () => {
  const config = read('open-next.config.ts')
  for (const [what, needle] of [
    ['incremental cache', 'incrementalCache:'],
    ['tag cache', 'tagCache:'],
    ['queue', 'queue:'],
    ['cache purge', 'cachePurge:'],
  ]) {
    assert.ok(config.includes(needle), `${what} is not wired in open-next.config.ts`)
  }

  const wrangler = read('wrangler.jsonc')
  for (const binding of [
    'NEXT_INC_CACHE_R2_BUCKET',
    'NEXT_TAG_CACHE_D1',
    'NEXT_CACHE_DO_QUEUE',
    'NEXT_CACHE_DO_PURGE',
  ]) {
    assert.ok(wrangler.includes(binding), `${binding} is missing from wrangler.jsonc`)
  }
})

// The package export map is `./*` -> `./dist/api/*.js`, and cache-purge is a
// directory. The bare specifier resolves to a file that does not exist and
// the build fails with a message that does not explain why.
test('the cache-purge import keeps its explicit /index', () => {
  assert.match(read('open-next.config.ts'), /overrides\/cache-purge\/index/)
})

test('no secret is committed in the Worker configuration', () => {
  for (const name of ['wrangler.jsonc', 'open-next.config.ts']) {
    const contents = read(name)
    assert.equal(
      /sk_live|rk_live|Bearer\s+[A-Za-z0-9]{20}|CLOUDFLARE_API_TOKEN\s*[:=]\s*["'][^"']+/.test(contents),
      false,
      `${name} looks like it carries a secret; real values belong in \`wrangler secret put\``,
    )
  }
})

// A committed .dev.vars would put the local preview's secrets in git, and the
// file is where a real token is most likely to be pasted by accident.
test('local preview secrets are ignored by git', () => {
  const ignore = read('.gitignore')
  for (const entry of ['.dev.vars', '/.open-next/', '/.wrangler/']) {
    assert.ok(ignore.includes(entry), `${entry} is not gitignored`)
  }
})

// Without interception, a page missing from the prerender manifest (every
// index page, anything published after the build) is stale one second after
// it is written, and the live site re-rendered those pages on nearly every
// visit (open-next.config.ts has the detail).
test('cache interception stays on', () => {
  assert.match(read('open-next.config.ts'), /enableCacheInterception:\s*true/)
})

// Interception hands every visitor the same cached bytes before the Next
// server runs. That is only right while no public page varies by request, so
// nothing a public page could import may read cookies or headers. Only the
// force-dynamic parts of the app (API routes, the private and search groups)
// are exempt.
test('no public page reads cookies or request headers', () => {
  const src = resolve(clientRoot, 'src')
  const exempt = /^app\/(api\/|\(private\)\/|\(search\)\/)/
  const offenders = readdirSync(src, { recursive: true })
    .filter((file) => /\.(tsx?|jsx?)$/.test(file) && !exempt.test(file))
    .filter((file) => /from\s+['"]next\/headers['"]/.test(readFileSync(resolve(src, file), 'utf8')))
  assert.deepEqual(offenders, [], "cache interception would serve one visitor's version of these pages to everyone")
})

// 1.18.1's cache-purge Durable Object handed the tag array to sql.exec as one
// binding, so every purge alarm threw and retried (fixed upstream in 1.20.x,
// which needs a newer Next). The purge is what clears the regional page
// copies on a publication, so the patch must stay applied.
test('the cache-purge Durable Object patch is applied', () => {
  const root = JSON.parse(readFileSync(resolve(clientRoot, '../../../../package.json'), 'utf8'))
  assert.ok(
    root.pnpm?.patchedDependencies?.['@opennextjs/cloudflare@1.18.1'],
    'patches/@opennextjs__cloudflare@1.18.1.patch is not registered in the root package.json',
  )
  const purge = readFileSync(
    resolve(realpathSync(resolve(clientRoot, 'node_modules/@opennextjs/cloudflare')), 'dist/api/durable-objects/bucket-cache-purge.js'),
    'utf8',
  )
  assert.match(purge, /\.\.\.tags\.map\(\(row\) => row\.tag\)/)
  assert.doesNotMatch(purge, /VALUES \(\?\)`, \[tag\]\)/)
})

// Fetched data must keep its tag check: see the comment in open-next.config.ts.
test('only rendered pages use the regional cache', () => {
  const config = read('open-next.config.ts')
  assert.match(config, /withRegionalCache\(r2IncrementalCache/)
  assert.match(config, /cacheType === 'fetch' \? r2IncrementalCache\.get/)
  assert.match(config, /cacheType === 'fetch' \? r2IncrementalCache\.set/)
})

// Skipping the tag check on a regional hit left a revalidated page stuck
// live (open-next.config.ts has the sequence). Both options are spelled out
// because the adapter's defaults flip them whenever cache purge is on.
test('a regional hit still checks the tag cache', () => {
  const config = read('open-next.config.ts')
  assert.match(config, /bypassTagCacheOnCacheHit:\s*false/)
  assert.match(config, /shouldLazilyUpdateOnCacheHit:\s*true/)
})
