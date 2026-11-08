#!/usr/bin/env node
/**
 * node scripts/check-map-pictures.mjs [--site https://www.questurian.com]
 *
 * Opens every map guide and itinerary in the public sitemap the way a reader
 * who has not joined sees it, on desktop and on a phone, and checks that its
 * map is a real picture that loaded. A locked page falls back to a drawing of
 * dots, with no error anywhere, when its picture is missing or when a place
 * moves outside it (MapTeaser.tsx). This is the only thing that notices.
 *
 * A free page passes on its Google map instead. Prints one row per page and
 * exits 1 when any page fails, so a scheduled run fails loudly. Reads public
 * pages only; needs no secrets. Launches the machine's own Google Chrome.
 */
import { chromium } from '@playwright/test'

const VIEWS = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
  { name: 'phone', width: 390, height: 844, isMobile: true },
]
const MAP_SELECTOR = `section[aria-label="Members' map"]`
const SETTLE_MS = 3000
const ATTEMPTS = 2

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index > -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

const site = arg('site', 'https://www.questurian.com').replace(/\/+$/, '')

/** Map guides and itineraries from the sitemap, as paths on this site. */
async function pagePaths() {
  const res = await fetch(`${site}/sitemap.xml`, {
    headers: { 'User-Agent': 'questura-map-picture-check' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`sitemap: HTTP ${res.status}`)
  const xml = await res.text()
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => new URL(match[1].trim()).pathname)
    .filter((path) => /\/(maps|itineraries)\/[^/]+\/?$/.test(path))
  return [...new Set(paths)]
}

/** What the page's map is right now, read from the page itself. */
function readMap(selector) {
  const section = document.querySelector(selector)
  if (!section) return { kind: document.querySelector('.gm-style') ? 'google-map' : 'none' }
  const image = section.querySelector('img')
  if (!image) return { kind: 'dots' }
  if (!image.complete) return { kind: 'loading' }
  return image.naturalWidth > 0 ? { kind: 'picture' } : { kind: 'broken-image', src: image.currentSrc || image.src }
}

/** Why a page's map is not acceptable, or null when it is. */
function problemWith(map) {
  if (map.kind === 'picture' || map.kind === 'google-map') return null
  if (map.kind === 'dots') return 'shows the dots drawing, not a picture'
  if (map.kind === 'broken-image') return `picture did not load (${map.src})`
  if (map.kind === 'loading') return 'picture never finished loading'
  return 'no map on the page'
}

async function checkOnce(context, path) {
  const page = await context.newPage()
  try {
    const res = await page.goto(`${site}${path}`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    if (!res?.ok()) return `HTTP ${res?.status() ?? 'no answer'}`
    await page.waitForSelector(`${MAP_SELECTOR}, .gm-style`, { timeout: 15_000, state: 'attached' }).catch(() => {})
    // The page only draws its picture once it has measured the box.
    await page.waitForTimeout(SETTLE_MS)
    await page
      .waitForFunction(
        (selector) => {
          const image = document.querySelector(selector)?.querySelector('img')
          return !image || image.complete
        },
        MAP_SELECTOR,
        { timeout: 10_000 },
      )
      .catch(() => {})
    return problemWith(await page.evaluate(readMap, MAP_SELECTOR))
  } catch (error) {
    return `could not open: ${String(error?.message ?? error).split('\n')[0]}`
  } finally {
    await page.close()
  }
}

async function main() {
  const paths = await pagePaths()
  if (paths.length === 0) throw new Error('the sitemap lists no map guides or itineraries')

  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const failures = []
  try {
    for (const view of VIEWS) {
      // A fresh context: no cookies, so this is a reader who has not joined.
      const context = await browser.newContext({
        viewport: { width: view.width, height: view.height },
        isMobile: view.isMobile,
        hasTouch: view.isMobile,
      })
      for (const path of paths) {
        // One retry, so a slow page or a dropped request does not email anyone.
        let problem = await checkOnce(context, path)
        for (let attempt = 2; problem && attempt <= ATTEMPTS; attempt += 1) problem = await checkOnce(context, path)
        console.log(`${problem ? 'FAIL' : 'ok  '}  ${view.name.padEnd(8)} ${path}${problem ? `  ${problem}` : ''}`)
        if (problem) failures.push({ view: view.name, path, problem })
      }
      await context.close()
    }
  } finally {
    await browser.close()
  }

  console.log(`\n${paths.length} pages on ${VIEWS.length} screen sizes: ${failures.length} failed.`)
  if (failures.length > 0) {
    console.log('\nFix: open the page in the AI Blog Writer, Map picture tab, take the picture, then sync.')
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(String(error?.message ?? error))
  process.exitCode = 1
})
