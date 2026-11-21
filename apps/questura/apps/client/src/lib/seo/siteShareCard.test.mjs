import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { SITE_SHARE_IMAGE } from './siteShareCard.ts'

// 2026-11-21: questurian.com had no og tags at all, so a pasted homepage link
// previewed as a bare URL in iMessage, WhatsApp and Instagram.

const client = (path) => new URL(`../../../${path}`, import.meta.url)

/** Width and height from a baseline or progressive JPEG's frame header. */
function jpegSize(bytes) {
  let at = 2
  while (at < bytes.length) {
    const marker = bytes[at + 1]
    const length = bytes.readUInt16BE(at + 2)
    if (marker >= 0xc0 && marker <= 0xc2) return { height: bytes.readUInt16BE(at + 5), width: bytes.readUInt16BE(at + 7) }
    at += 2 + length
  }
  throw new Error('no JPEG frame header')
}

test('the site share card is a 1200×630 JPEG in public/, as declared', () => {
  const bytes = readFileSync(client(`public${SITE_SHARE_IMAGE.url}`))
  assert.equal(bytes.readUInt16BE(0), 0xffd8, 'not a JPEG')
  assert.deepEqual(jpegSize(bytes), { width: SITE_SHARE_IMAGE.width, height: SITE_SHARE_IMAGE.height })
  assert.ok(bytes.length < 300_000, 'chat apps drop large preview images')
})

test('the homepage carries a full link preview with the site card', () => {
  const page = readFileSync(client('src/app/(public)/page.tsx'), 'utf8')
  assert.match(page, /openGraph: \{[\s\S]*url: '\/'[\s\S]*images: \[SITE_SHARE_IMAGE\]/)
  assert.match(page, /twitter: \{ card: 'summary_large_image'[\s\S]*images: \[SITE_SHARE_IMAGE\]/)
})

test('the root layout sets no share image, so the Lima card never lands on a page that is not Lima', () => {
  const layout = readFileSync(client('src/app/layout.tsx'), 'utf8')
  assert.match(layout, /openGraph: \{ type: "website", siteName: "Questurian"/)
  assert.doesNotMatch(layout, /SITE_SHARE_IMAGE|images:/)
})
