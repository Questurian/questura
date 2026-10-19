#!/usr/bin/env node
/**
 * Renders the map picture a non-member sees on a locked guide or itinerary
 * (MapTeaser.tsx), one per guide, from OpenStreetMap data.
 *
 * Why a saved picture and not Google: non-members must not load a billed
 * Google map, and Google's terms forbid storing pictures of their map
 * ("No Scraping": no pre-fetch, store, reshare or rehost). OpenStreetMap data
 * may be stored and restyled freely; it asks only for the "© OpenStreetMap"
 * credit, which the page prints beside the picture.
 *
 * The tiles come from OpenFreeMap (free, no key, commercial use allowed),
 * drawn by MapLibre in headless Chrome. Each guide's frame holds every place
 * a non-member's map draws, kept in the upper part where the join card does
 * not sit, so the site can lay its own markers over the picture.
 *
 * Usage (from apps/questura/apps/e2e), with the API that serves the guides:
 *   node scripts/render-map-teasers.mjs [api-base]        # default https://api.questurian.com
 *   node scripts/render-map-teasers.mjs http://localhost:4000 --only maps:16
 *
 * Writes client/public/images/map-teasers/<type>-<id>.webp (2x) and
 * <type>-<id>-782.webp (1x), and client/src/features/articles/data/mapTeasers.json.
 * Run it again whenever a guide is published or its places move; a guide with
 * no picture, or whose places fall outside its picture, shows the drawn teaser.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const HERE = dirname(fileURLToPath(import.meta.url))
const CLIENT = resolve(HERE, '../../client')
const IMAGE_DIR = resolve(CLIENT, 'public/images/map-teasers')
const MANIFEST = resolve(CLIENT, 'src/features/articles/data/mapTeasers.json')

const args = process.argv.slice(2)
const api = (args.find((arg) => !arg.startsWith('--') && args[args.indexOf(arg) - 1] !== '--only') ?? 'https://api.questurian.com').replace(/\/$/, '')
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null

/** The desktop map area on a guide page, in CSS px. Phones crop the same picture. */
const FRAME = { width: 782, height: 690 }
/** Places stay above the join card, which covers the lower part of the frame. */
const PADDING = { top: 60, bottom: 290, left: 80, right: 80 }
const MAPLIBRE = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js'
const STYLE = 'https://tiles.openfreemap.org/styles/positron'

async function getJson(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} for ${url}`)
  return response.json()
}

/** Every public guide and itinerary, from the sitemap the site itself is built from. */
async function guides() {
  const sitemap = await getJson(`${api}/api/public/sitemap-entries?lang=en`)
  return sitemap.content
    .map((entry) => entry.url.split('/').filter(Boolean))
    .filter((parts) => parts.length >= 3 && ['maps', 'itineraries'].includes(parts[parts.length - 2]))
    .map((parts) => {
      const [country, city] = parts.length === 4 ? [parts[0], parts[1]] : [parts[0], null]
      return { type: parts[parts.length - 2], slug: parts[parts.length - 1], country, city }
    })
}

/** What a non-member's map draws: the rough pins, plus an itinerary's lodging. */
function pointsOf(article) {
  const points = (article.gate?.mapPins ?? []).map((pin) => ({ lat: pin.lat, lng: pin.lng }))
  for (const row of article.whereStaying ?? []) {
    const item = row?.item
    if (typeof item?.latitude === 'number' && typeof item?.longitude === 'number') {
      points.push({ lat: item.latitude, lng: item.longitude })
    }
  }
  return points
}

async function render(page, points) {
  return page.evaluate(
    async ({ points, frame, padding, style }) => {
      document.body.innerHTML = `<div id="m" style="width:${frame.width}px;height:${frame.height}px"></div>`
      const map = new maplibregl.Map({
        container: 'm',
        style,
        attributionControl: false,
        interactive: false,
        fadeDuration: 0,
        preserveDrawingBuffer: true,
      })
      await new Promise((resolve) => map.once('load', resolve))
      const bounds = points.reduce(
        (box, p) => box.extend([p.lng, p.lat]),
        new maplibregl.LngLatBounds([points[0].lng, points[0].lat], [points[0].lng, points[0].lat]),
      )
      map.fitBounds(bounds, { padding, duration: 0, maxZoom: 15 })
      await new Promise((resolve) => map.once('idle', resolve))
      const canvas = map.getCanvas()
      const small = document.createElement('canvas')
      small.width = frame.width
      small.height = frame.height
      small.getContext('2d').drawImage(canvas, 0, 0, frame.width, frame.height)
      const center = map.getCenter()
      return {
        large: canvas.toDataURL('image/webp', 0.86),
        small: small.toDataURL('image/webp', 0.86),
        center: [Number(center.lng.toFixed(6)), Number(center.lat.toFixed(6))],
        zoom: Number(map.getZoom().toFixed(4)),
      }
    },
    { points, frame: FRAME, padding: PADDING, style: STYLE },
  )
}

const writeDataUrl = (path, dataUrl) => writeFileSync(path, Buffer.from(dataUrl.split(',')[1], 'base64'))

mkdirSync(IMAGE_DIR, { recursive: true })
mkdirSync(dirname(MANIFEST), { recursive: true })
let manifest = {}
try {
  manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
} catch {
  manifest = {}
}

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: FRAME, deviceScaleFactor: 2 })
await page.setContent('<!doctype html><body style="margin:0"></body>')
await page.addScriptTag({ url: MAPLIBRE })

for (const guide of await guides()) {
  const scope = guide.city ? `scope=city&country=${guide.country}&city=${guide.city}` : `scope=country&country=${guide.country}`
  const article = await getJson(`${api}/api/public/articles/by-id?${scope}&type=${guide.type}&slug=${guide.slug}&lang=en`)
  const key = `${guide.type}:${article.id}`
  if (only && key !== only) continue
  if (article.gate?.locked !== true) {
    console.log(`skip ${key} (${guide.slug}): not locked, members and readers alike get the Google map`)
    continue
  }
  const points = pointsOf(article)
  if (points.length === 0) {
    console.log(`skip ${key} (${guide.slug}): no places on the map`)
    continue
  }
  const shot = await render(page, points)
  const name = `${guide.type}-${article.id}`
  writeDataUrl(resolve(IMAGE_DIR, `${name}.webp`), shot.large)
  writeDataUrl(resolve(IMAGE_DIR, `${name}-782.webp`), shot.small)
  manifest[key] = {
    src: `/images/map-teasers/${name}.webp`,
    srcSmall: `/images/map-teasers/${name}-782.webp`,
    width: FRAME.width,
    height: FRAME.height,
    center: shot.center,
    zoom: shot.zoom,
  }
  console.log(`rendered ${key} (${guide.slug}): ${points.length} places, zoom ${shot.zoom}`)
}

await browser.close()
const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true })))
writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`)
console.log(`${Object.keys(sorted).length} pictures in ${MANIFEST}`)
