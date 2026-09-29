#!/usr/bin/env node
/**
 * node scripts/check-structured-data.mjs [--site https://www.questurian.com] [--kind standard|itinerary|all] [--json out.json]
 *
 * Opens every article page in the site's public sitemap and checks its
 * structured data (JSON-LD) against the rules in
 * src/lib/seo/structuredDataCheck.mjs: one article entry, the real address,
 * a real author, dates, a picture, and the paid flag on that same entry.
 * Prints one pass/fail row per page and every reason, and exits 1 when any
 * page fails, so a scheduled run fails loudly.
 *
 * Reads public pages only; needs no secrets. Articles are the sitemap entries
 * with the content priority. Map pages are left out (their structured data is
 * a different shape and not part of this check).
 *
 * `--site http://localhost:3000` checks a local build; the canonical link
 * there points at whatever NEXT_PUBLIC_FRONTEND_URL the build used.
 */
import { writeFileSync } from 'node:fs'

import { RULES, checkArticleStructuredData } from '../src/lib/seo/structuredDataCheck.mjs'
import { SITEMAP_PRIORITY } from '../src/lib/seo/sitemapPriority.mjs'

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index > -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

const site = arg('site', 'https://www.questurian.com').replace(/\/+$/, '')
const kind = arg('kind', 'all')
const jsonOut = arg('json', null)
const USER_AGENT = 'questura-structured-data-check'

async function get(url) {
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        redirect: 'follow',
        signal: AbortSignal.timeout(30_000),
      })
      if (res.ok) return await res.text()
      lastError = new Error(`HTTP ${res.status}`)
      if (res.status < 500) break
    } catch (error) {
      lastError = error
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt))
  }
  throw new Error(`${url}: ${lastError?.message ?? 'failed'}`)
}

function kindOf(path) {
  if (/\/maps\//.test(path)) return 'maps'
  if (/\/itineraries\//.test(path)) return 'itinerary'
  return 'standard'
}

/** Article pages from the sitemap: the entries with the content priority. */
function articleUrls(xml) {
  const urls = []
  for (const [, entry] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = entry.match(/<loc>([^<]+)<\/loc>/)?.[1]
    const priority = Number(entry.match(/<priority>([^<]+)<\/priority>/)?.[1])
    if (loc && priority === SITEMAP_PRIORITY.content) urls.push(loc.trim())
  }
  return urls
}

async function main() {
  const sitemap = await get(`${site}/sitemap.xml`)
  const pages = articleUrls(sitemap)
    .map((url) => {
      const path = new URL(url).pathname
      // Local runs: the sitemap names the configured public host, fetch this one.
      return { path, kind: kindOf(path), fetchUrl: `${site}${path}` }
    })
    .filter((page) => page.kind !== 'maps')
    .filter((page) => kind === 'all' || page.kind === kind)

  if (pages.length === 0) {
    console.error(`No article pages found in ${site}/sitemap.xml`)
    process.exit(1)
  }

  const rows = []
  for (const page of pages) {
    try {
      const html = await get(page.fetchUrl)
      rows.push({ ...page, ...checkArticleStructuredData(html) })
    } catch (error) {
      rows.push({ ...page, ok: false, fetchError: error.message, results: {} })
    }
  }

  const mark = (result) => (result === undefined ? '-' : result.ok ? 'ok' : 'FAIL')
  const header = ['page', 'kind', ...RULES]
  const table = rows.map((row) => [row.path, row.kind, ...RULES.map((rule) => mark(row.results[rule]))])
  const widths = header.map((h, i) => Math.max(h.length, ...table.map((r) => r[i].length)))
  const line = (cells) => cells.map((c, i) => c.padEnd(widths[i])).join('  ')
  console.log(line(header))
  table.forEach((r) => console.log(line(r)))

  const failing = rows.filter((row) => !row.ok)
  console.log(`\n${rows.length - failing.length} of ${rows.length} pages pass (${site}, ${new Date().toISOString()})`)

  if (failing.length > 0) {
    console.log('\nWhy:')
    for (const row of failing) {
      console.log(`\n${row.path}`)
      if (row.fetchError) console.log(`  fetch: ${row.fetchError}`)
      for (const rule of RULES) {
        const result = row.results[rule]
        if (result && !result.ok) console.log(`  ${rule}: ${result.detail}`)
      }
    }
  }

  if (jsonOut) {
    writeFileSync(jsonOut, `${JSON.stringify({ site, checkedAt: new Date().toISOString(), rows }, null, 2)}\n`)
  }

  process.exit(failing.length > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
