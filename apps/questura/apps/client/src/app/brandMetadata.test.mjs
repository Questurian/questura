import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const here = (path) => fileURLToPath(new URL(path, import.meta.url))
const layout = readFileSync(here('./layout.tsx'), 'utf8')

// 2026-09-26 live sweep: /purchase/*, /account*, /subscription/*, /articles
// and the 404 all showed "Questura" in the tab. The brand is Questurian.
test('the default tab title is the brand', () => {
  assert.match(layout, /title: "Questurian",/)
  assert.doesNotMatch(layout, /title: "Questura"/)
})

// /favicon.ico, /apple-icon.png and /manifest.webmanifest answered 404: only
// /icon.svg existed. Next serves and links these by file convention, so the
// files themselves are the fix.
test('the site ships a favicon, an Apple touch icon and a manifest', () => {
  for (const file of ['icon.svg', 'favicon.ico', 'apple-icon.png', 'manifest.ts']) {
    assert.ok(existsSync(here(`./${file}`)), `src/app/${file} is missing`)
  }
  const png = readFileSync(here('./apple-icon.png'))
  assert.equal(png.subarray(1, 4).toString('latin1'), 'PNG')
  assert.equal(png.readUInt32BE(16), 180, 'apple-icon.png is not 180px wide')
  assert.equal(png.readUInt32BE(20), 180, 'apple-icon.png is not 180px tall')
})

// The middleware must leave the icon files alone: an asset path that fell
// through to the page routes would render a 404 page instead of the icon.
test('the middleware passes icon and manifest paths straight through', () => {
  const middleware = readFileSync(here('../middleware.ts'), 'utf8')
  assert.match(middleware, /\/\\\.\[a-zA-Z0-9\]\+\$\/\.test\(pathname\)/)
})

// 2026-09-27 live check (#7): /join sent only a title and description, so the
// subscribe link pasted into a text or post showed no card and no picture.
test('/join carries a full link preview and still no price', () => {
  const join = readFileSync(here('./join/page.tsx'), 'utf8')
  const metadata = join.slice(join.indexOf('const title'), join.indexOf('async function JoinPricing'))
  assert.match(metadata, /canonical: '\/join'/)
  assert.match(metadata, /openGraph: \{[\s\S]*images: \[shareImage\]/)
  assert.match(metadata, /card: 'summary_large_image'/)
  assert.doesNotMatch(metadata, /\$\d|\d\.\d\d/, 'a price in static metadata drifts from Stripe')
  const image = metadata.match(/url: '(\/images\/join\/[^']+\.jpg)'/)
  assert.ok(image, 'expected a JPEG share image under /images/join')
  assert.ok(existsSync(here(`../../public${image[1]}`)), `public${image[1]} is missing`)
})
