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
 * Two pictures per guide (FRAMES): `wide` for the phone and any short map
 * box, `tall` for a locked guide's desktop column, which runs the height of
 * the article beside it. The page uses whichever needs less zooming.
 *
 * Usage (from apps/questura/apps/e2e), with the API that serves the guides:
 *   node scripts/render-map-teasers.mjs [api-base]        # default https://api.questurian.com
 *   node scripts/render-map-teasers.mjs http://localhost:4000 --only maps:16
 *   node scripts/render-map-teasers.mjs --frame tall      # one of the two pictures only
 *
 * Writes client/public/images/map-teasers/<type>-<id>[-tall].webp (2x) and
 * <type>-<id>[-tall]-782.webp (1x), and client/src/features/articles/data/mapTeasers.json.
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
const OPTIONS = ['--only', '--frame']
const api = (args.find((arg) => !arg.startsWith('--') && !OPTIONS.includes(args[args.indexOf(arg) - 1])) ?? 'https://api.questurian.com').replace(/\/$/, '')
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null

/**
 * The pictures, in CSS px, with where the places go in each.
 *
 * - `wide`: the pinned desktop map's size. Phones crop it. Places stay above
 *   the join card, which covers the lower part.
 * - `tall`: a locked guide's desktop column (ListicleArticleLayout), with map
 *   above and below for the page to slide the picture on: it puts the places
 *   above the join card (MapTeaser). Its places' strip is 420 px high, not the
 *   wide picture's 340, so a guide spread north to south fills more of the
 *   column (owner, 2026-10-20: "a little bit too zoomed out"); 420 still sits
 *   above the card in a column down to 780 px. The side margin is wider
 *   because a narrow desktop column crops the sides.
 */
const FRAMES = {
  wide: { width: 782, height: 690, suffix: '', padding: { top: 60, bottom: 290, left: 80, right: 80 } },
  tall: { width: 782, height: 1400, suffix: '-tall', padding: { top: 410, bottom: 570, left: 110, right: 110 } },
}
const frameNames = args.includes('--frame') ? [args[args.indexOf('--frame') + 1]] : Object.keys(FRAMES)
for (const name of frameNames) if (!FRAMES[name]) throw new Error(`--frame must be one of: ${Object.keys(FRAMES).join(', ')}`)
const MAPLIBRE = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js'
const STYLE = 'https://tiles.openfreemap.org/styles/positron'

/**
 * The neighborhoods a picture names, per city (owner's choice, 2026-10-19:
 * "just the big ones"). Any other district label is dropped. A city not
 * listed keeps every label.
 */
const BIG_PLACES = {
  lima: ['Lima', 'Callao', 'Miraflores', 'Barranco', 'San Isidro', 'Magdalena', 'Magdalena del Mar', 'La Victoria', 'Pueblo Libre', 'Lince', 'San Miguel'],
  medellin: ['Medellín', 'El Poblado', 'Laureles', 'Envigado', 'Belén', 'La América', 'Itagüí', 'Bello', 'Sabaneta'],
  'mexico-city': ['Ciudad de México', 'Mexico City', 'Roma Norte', 'Roma Sur', 'Condesa', 'Hipódromo', 'Juárez', 'Polanco', 'Centro', 'Coyoacán', 'San Rafael', 'Escandón'],
}

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

async function render(page, points, labelNames, { width, height, padding }) {
  const frame = { width, height }
  await page.setViewportSize(frame)
  const drawn = await page.evaluate(
    async ({ points, frame, padding, style, labelNames }) => {
      document.body.innerHTML = `<div id="wrap" style="position:relative;width:${frame.width}px;height:${frame.height}px;overflow:hidden">
        <div id="m" style="position:absolute;inset:0"></div><div id="labels" style="position:absolute;inset:0"></div></div>`
      const map = new maplibregl.Map({
        container: 'm',
        style,
        attributionControl: false,
        interactive: false,
        fadeDuration: 0,
        preserveDrawingBuffer: true,
      })
      await new Promise((resolve) => map.once('load', resolve))

      // The map draws shapes only, in the site's Google colours: no text,
      // so no highway shields, street names or small districts. The names
      // that stay are written over it below, in Roboto like Google's.
      let placeSource = null
      for (const layer of map.getStyle().layers) {
        const { id, type } = layer
        const paint = (prop, value) => map.setPaintProperty(id, prop, value)
        if (type === 'background') paint('background-color', '#f2f2f2')
        else if (id === 'water') paint('fill-color', '#c9d7e4')
        else if (id === 'park' || id === 'landcover_wood') paint('fill-color', '#d3ead2')
        else if (id === 'building') paint('fill-color', '#e8e8ea')
        // The members' map draws no district borders either.
        if (type === 'line' && /boundary/.test(id)) map.setLayoutProperty(id, 'visibility', 'none')
        if (type === 'symbol') {
          if (layer['source-layer'] === 'place') placeSource = layer.source
          map.setLayoutProperty(id, 'visibility', 'none')
        }
      }

      const bounds = points.reduce(
        (box, p) => box.extend([p.lng, p.lat]),
        new maplibregl.LngLatBounds([points[0].lng, points[0].lat], [points[0].lng, points[0].lat]),
      )
      map.fitBounds(bounds, { padding, duration: 0, maxZoom: 15 })
      await new Promise((resolve) => map.once('idle', resolve))

      // The big neighborhoods, where OpenStreetMap puts them, once each.
      const wanted = new Set(labelNames)
      const seen = new Set()
      const labels = []
      for (const feature of placeSource ? map.querySourceFeatures(placeSource, { sourceLayer: 'place' }) : []) {
        const props = feature.properties ?? {}
        const label = props.name_en || props.name
        if (!label || seen.has(label) || !wanted.has(label)) continue
        if (!['city', 'town', 'village', 'suburb', 'quarter', 'neighbourhood'].includes(props.class)) continue
        const [lng, lat] = feature.geometry.coordinates
        const at = map.project([lng, lat])
        if (at.x < 20 || at.y < 14 || at.x > frame.width - 20 || at.y > frame.height - 14) continue
        seen.add(label)
        labels.push({ label, x: at.x, y: at.y, big: props.class === 'city' || props.class === 'town' })
      }

      // The site draws a marker on every place; a name under one moves just
      // above or below it, whichever covers fewer markers.
      const markers = points.map((p) => map.project([p.lng, p.lat]))
      for (const entry of labels) {
        const halfWidth = (entry.label.length * (entry.big ? 9.5 : 6.8)) / 2 + 8
        const halfHeight = (entry.big ? 12 : 9) + 8
        const covered = (y) => markers.filter((m) => Math.abs(m.x - entry.x) < halfWidth && Math.abs(m.y - y) < halfHeight).length
        const shift = halfHeight + 4
        entry.y = [entry.y, entry.y - shift, entry.y + shift].reduce((best, y) => (covered(y) < covered(best) ? y : best))
      }
      document.getElementById('labels').innerHTML = labels
        .map(
          ({ label, x, y, big }) =>
            `<span style="position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%);white-space:nowrap;` +
            `font-family:Roboto,Arial,sans-serif;font-weight:${big ? 500 : 400};font-size:${big ? 18 : 13}px;` +
            `color:${big ? '#3c4043' : '#5f6368'};text-shadow:0 0 2px #fff,0 0 2px #fff,0 0 3px #fff,0 0 3px #fff">${label}</span>`,
        )
        .join('')
      await document.fonts.load('500 18px Roboto')
      await document.fonts.load('400 13px Roboto')
      await document.fonts.ready

      const center = map.getCenter()
      return {
        center: [Number(center.lng.toFixed(6)), Number(center.lat.toFixed(6))],
        zoom: Number(map.getZoom().toFixed(4)),
        labels: labels.map((l) => l.label),
      }
    },
    { points, frame, padding, style: STYLE, labelNames },
  )

  // The map and its names together, at 2x, then as WebP at both sizes.
  const png = (await page.locator('#wrap').screenshot({ type: 'png' })).toString('base64')
  const encoded = await page.evaluate(
    async ({ png, frame }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${png}`
      await image.decode()
      const encode = (width, height) => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(image, 0, 0, width, height)
        return canvas.toDataURL('image/webp', 0.86)
      }
      return { large: encode(frame.width * 2, frame.height * 2), small: encode(frame.width, frame.height) }
    },
    { png, frame },
  )
  return { ...drawn, ...encoded }
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
const page = await browser.newPage({ viewport: FRAMES.wide, deviceScaleFactor: 2 })
// A style the renderer rejects still "renders" -- as an empty background.
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') console.error(`  page ${message.type()}: ${message.text().slice(0, 200)}`)
})
page.on('pageerror', (error) => console.error(`  page error: ${error.message.slice(0, 200)}`))
await page.setContent(
  '<!doctype html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=block"></head><body style="margin:0"></body>',
)
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
  // A city without a list names the guide's own neighborhoods.
  const areas = (article.gate?.mapPins ?? []).map((pin) => pin.area).filter(Boolean)
  // A guide new to the manifest needs its wide picture: the tall one hangs off it.
  const names = manifest[key] || frameNames.includes('wide') ? frameNames : ['wide', ...frameNames]
  for (const frameName of names) {
    const frame = FRAMES[frameName]
    const shot = await render(page, points, BIG_PLACES[guide.city ?? ''] ?? areas, frame)
    const name = `${guide.type}-${article.id}${frame.suffix}`
    writeDataUrl(resolve(IMAGE_DIR, `${name}.webp`), shot.large)
    writeDataUrl(resolve(IMAGE_DIR, `${name}-782.webp`), shot.small)
    const picture = {
      src: `/images/map-teasers/${name}.webp`,
      srcSmall: `/images/map-teasers/${name}-782.webp`,
      width: frame.width,
      height: frame.height,
      center: shot.center,
      zoom: shot.zoom,
    }
    manifest[key] = frameName === 'wide' ? { ...picture, tall: manifest[key]?.tall } : { ...manifest[key], tall: picture }
    console.log(`rendered ${key} ${frameName} (${guide.slug}): ${points.length} places, zoom ${shot.zoom}, names: ${shot.labels.join(', ') || 'none'}`)
  }
}

await browser.close()
const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true })))
writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`)
console.log(`${Object.keys(sorted).length} pictures in ${MANIFEST}`)
