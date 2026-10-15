#!/usr/bin/env node
// Alignment check for Questura pages: screenshots each block with guide lines
// drawn over it and prints the misalignments it can measure.
//
// usage:
//   node align.mjs <url> [--width 1440] [--block <n|selector>] [--out <dir>] [--scale 1]
//
//   --block 3            only the 4th block of the homepage-style block list
//   --block 'footer'     any CSS selector instead
//   (default)            every block in the page's block list
//
// Writes <out>/<width>-<n>-<label>.png (overlay) and prints one report line
// per finding. Exit code 0 always: it is a measuring tool, not a gate.
//
// Guide lines on the overlay:
//   cyan     the page content edges (--block-max-width inset by --block-gutter)
//   magenta  every distinct left/right edge of images and text ink in the block
//   red      cap height and baseline of each title (h2/h3, block-type-title-*)
//   lime     x-height of each title
//   orange   top edge of each column's first image and first text line
//
// It needs Chrome installed (it launches the `chrome` channel) and the
// Playwright package from apps/questura/apps/e2e.

import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '../../../..')
const require = createRequire(path.join(repoRoot, 'apps/questura/apps/e2e/package.json'))
const { chromium } = require('@playwright/test')

const args = process.argv.slice(2)
const url = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'))
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
if (!url) {
  console.error('usage: node align.mjs <url> [--width 1440] [--block <n|selector>] [--out dir] [--scale 1]')
  process.exit(2)
}
const width = Number(opt('width', '1440'))
const blockArg = opt('block', null)
const outDir = path.resolve(opt('out', path.join(process.env.TMPDIR ?? '/tmp', 'align-check')))
const scale = Number(opt('scale', '1'))
// Differences at or under this many px are rendering noise, not a finding.
const TOLERANCE = 1.5
// Differences over this are treated as a deliberate offset (an indent, a
// second column), not a near-miss.
const NEAR_MISS_MAX = 40

mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: scale })
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
// Load lazy images, then pin the navbar so element screenshots are not covered.
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 500) {
    window.scrollTo(0, y)
    await new Promise((r) => setTimeout(r, 60))
  }
  window.scrollTo(0, 0)
})
await page.addStyleTag({
  content:
    '.site-nav,header{position:static!important} nextjs-portal,[data-nextjs-dev-tools-button],[data-nextjs-toast]{display:none!important}',
})
await page.waitForTimeout(600)

const targets = await page.evaluate((blockArg) => {
  const list = document.querySelector('[class*="bg-[#f5f0e8] text-[#1a1a1a]"]')
  const blocks = list ? [...list.children].filter((e) => e.tagName !== 'H1') : []
  let chosen
  if (blockArg === null) chosen = blocks.length ? blocks : [document.querySelector('main') ?? document.body]
  else if (/^\d+$/.test(blockArg)) chosen = [blocks[Number(blockArg)]].filter(Boolean)
  else chosen = [...document.querySelectorAll(blockArg)]
  return chosen.map((el, i) => {
    el.setAttribute('data-align-target', String(i))
    const label =
      el.getAttribute('aria-label') ||
      el.querySelector('h2')?.textContent?.trim() ||
      el.tagName.toLowerCase()
    return { i, label: label.replace(/[^a-z0-9]+/gi, '-').slice(0, 30) }
  })
}, blockArg)

const findings = []

for (const target of targets) {
  const result = await page.evaluate(
    ({ i, TOLERANCE, NEAR_MISS_MAX }) => {
      const root = document.querySelector(`[data-align-target="${i}"]`)
      const rb = root.getBoundingClientRect()
      const sx = scrollX
      const sy = scrollY
      const out = []
      const layer = document.createElement('div')
      layer.setAttribute('data-align-layer', '')
      Object.assign(layer.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        width: '100%',
        height: `${document.documentElement.scrollHeight}px`,
        pointerEvents: 'none',
        zIndex: '2147483647',
      })
      document.body.appendChild(layer)
      const hair = 1 / devicePixelRatio
      const h = (y, color, x0 = rb.left, x1 = rb.right) => {
        const d = document.createElement('div')
        Object.assign(d.style, { position: 'absolute', left: `${x0 + sx}px`, top: `${y + sy}px`, width: `${x1 - x0}px`, borderTop: `${hair}px solid ${color}`, opacity: '0.85' })
        layer.appendChild(d)
      }
      const v = (x, color, y0 = rb.top, y1 = rb.bottom) => {
        const d = document.createElement('div')
        Object.assign(d.style, { position: 'absolute', left: `${x + sx}px`, top: `${y0 + sy}px`, height: `${y1 - y0}px`, borderLeft: `${hair}px solid ${color}`, opacity: '0.85' })
        layer.appendChild(d)
      }
      const visible = (el) => {
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'
      }

      // Text ink metrics for the first line of an element.
      const ctx = document.createElement('canvas').getContext('2d')
      const metrics = (el) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
        let t
        while ((t = walker.nextNode()) && !t.textContent.trim());
        if (!t) return null
        const range = document.createRange()
        range.selectNodeContents(t)
        const rr = [...range.getClientRects()].find((r) => r.width > 0)
        if (!rr) return null
        const cs = getComputedStyle(t.parentElement)
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
        const H = ctx.measureText('H')
        const x = ctx.measureText('x')
        const first = ctx.measureText(t.textContent.trim()[0])
        const contentH = H.fontBoundingBoxAscent + H.fontBoundingBoxDescent
        const baseline = rr.top + (rr.height - contentH) / 2 + H.fontBoundingBoxAscent
        const lead = t.textContent.length - t.textContent.trimStart().length
        return {
          text: t.textContent.trim().slice(0, 32),
          capTop: baseline - H.actualBoundingBoxAscent,
          xTop: baseline - x.actualBoundingBoxAscent,
          baseline,
          // An inline icon before the text (the Maps pin) is where the ink
          // starts, so the line's left edge is the leftmost of the two.
          inkLeft: Math.min(
            rr.left - (lead ? 0 : first.actualBoundingBoxLeft),
            ...[...el.querySelectorAll('svg')]
              .map((svg) => svg.getBoundingClientRect())
              .filter((r) => r.width > 0 && Math.abs(r.top - rr.top) < rr.height)
              .map((r) => r.left),
          ),
        }
      }

      // Content edges of the page grid.
      const rootStyle = getComputedStyle(document.documentElement)
      const maxW = parseFloat(rootStyle.getPropertyValue('--block-max-width')) || 1400
      const gutter = parseFloat(rootStyle.getPropertyValue('--block-gutter')) || 24
      const contentW = Math.min(innerWidth - (innerWidth - document.documentElement.clientWidth), maxW)
      const leftEdge = (document.documentElement.clientWidth - contentW) / 2 + gutter
      const rightEdge = (document.documentElement.clientWidth + contentW) / 2 - gutter
      v(leftEdge, 'cyan')
      v(rightEdge, 'cyan')

      // Full-bleed photos (edge to edge of the viewport) are a deliberate
      // break from the grid, so they are left out of the edge checks.
      const viewportW = document.documentElement.clientWidth
      const images = [...root.querySelectorAll('img, picture, [class*="aspect-"]')]
        .filter((el) => el.tagName !== 'PICTURE' || !el.querySelector('img'))
        .filter(visible)
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width >= 40 && r.height >= 40)
        .filter((r) => !(r.left <= 0.5 && r.right >= viewportW - 0.5))
      const titles = [...root.querySelectorAll('h2, h3, [class*="block-type-title"]')].filter(visible)
      const kickers = [...root.querySelectorAll('[class*="block-type-kicker"]')].filter(visible)

      // Edges: images and text blocks.
      const edges = new Set()
      for (const r of images) {
        edges.add(Math.round(r.left))
        edges.add(Math.round(r.right))
      }
      for (const el of [...titles, ...kickers]) {
        const m = metrics(el)
        if (m) edges.add(Math.round(m.inkLeft))
      }
      for (const x of edges) v(x, 'magenta')

      // Title guides.
      for (const el of titles) {
        const m = metrics(el)
        if (!m) continue
        const r = el.getBoundingClientRect()
        h(m.capTop, 'red', r.left - 8, r.right + 8)
        h(m.baseline, 'red', r.left - 8, r.right + 8)
        h(m.xTop, 'lime', r.left - 8, r.right + 8)
      }

      // Finding 1: text that starts a few px off the image it sits under/over.
      for (const el of [...titles, ...kickers]) {
        const m = metrics(el)
        if (!m) continue
        const er = el.getBoundingClientRect()
        // Nearest image in the same card: same column, directly above.
        const above = images
          .filter((r) => r.bottom <= er.top + 2 && er.top - r.bottom < 80 && er.left < r.right && er.right > r.left)
          .sort((a, b) => b.bottom - a.bottom)[0]
        if (!above) continue
        const d = m.inkLeft - above.left
        if (Math.abs(d) > TOLERANCE && Math.abs(d) <= NEAR_MISS_MAX) {
          out.push(`text "${m.text}" starts ${d.toFixed(1)}px ${d > 0 ? 'right of' : 'left of'} the image above it (image x=${above.left.toFixed(1)}, ink x=${m.inkLeft.toFixed(1)})`)
        }
      }

      // Finding 2: block content that misses the page grid edges.
      // Centred copy is meant to float in its column, so only left-aligned
      // titles count toward the left edge.
      const all = [
        ...images,
        ...titles.filter((t) => getComputedStyle(t).textAlign !== 'center').map((t) => t.getBoundingClientRect()),
      ]
      if (all.length) {
        const minL = Math.min(...all.map((r) => r.left))
        const maxR = Math.max(...images.map((r) => r.right), -Infinity)
        const dl = minL - leftEdge
        if (Math.abs(dl) > TOLERANCE && Math.abs(dl) <= NEAR_MISS_MAX) out.push(`content starts ${dl.toFixed(1)}px off the page's left content edge (${leftEdge.toFixed(1)})`)
        if (Number.isFinite(maxR)) {
          const dr = maxR - rightEdge
          if (Math.abs(dr) > TOLERANCE && Math.abs(dr) <= 80) out.push(`rightmost image ends ${dr.toFixed(1)}px off the page's right content edge (${rightEdge.toFixed(1)})`)
        }
      }

      // Finding 2b: horizontal rules that overrun or fall short of the page
      // grid. A full-bleed rule (edge to edge of the viewport) is deliberate.
      for (const el of [root, ...root.querySelectorAll('*')]) {
        const cs = getComputedStyle(el)
        for (const side of ['Top', 'Bottom']) {
          if (parseFloat(cs[`border${side}Width`]) < 0.5 || cs[`border${side}Style`] === 'none') continue
          const r = el.getBoundingClientRect()
          if (r.width < 200 || (r.left <= 0.5 && r.right >= viewportW - 0.5)) continue
          const dl = r.left - leftEdge
          const dr = r.right - rightEdge
          const y = side === 'Top' ? r.top : r.bottom
          // Only rules that run (nearly) the full content width are page-grid rules.
          if (r.width < (rightEdge - leftEdge) * 0.9) continue
          if ((Math.abs(dl) > TOLERANCE && Math.abs(dl) <= NEAR_MISS_MAX) || (Math.abs(dr) > TOLERANCE && Math.abs(dr) <= NEAR_MISS_MAX)) {
            out.push(`a ${side.toLowerCase()} rule (.${[...el.classList].slice(0, 2).join(".")}) at y=${(y + sy).toFixed(0)} runs from x=${r.left.toFixed(1)} to ${r.right.toFixed(1)}; the content edges are ${leftEdge.toFixed(1)}–${rightEdge.toFixed(1)}`)
            h(y, 'orange', r.left, r.right)
          }
        }
      }

      // Finding 3: tops of side-by-side columns that nearly line up.
      const firstImgTop = images.length ? Math.min(...images.map((r) => r.top)) : null
      if (firstImgTop !== null) {
        const tops = images.filter((r) => Math.abs(r.top - firstImgTop) <= NEAR_MISS_MAX)
        for (const r of tops) {
          const d = r.top - firstImgTop
          if (Math.abs(d) > TOLERANCE) out.push(`an image at x=${r.left.toFixed(0)} starts ${d.toFixed(1)}px below the block's first image top`)
        }
        h(firstImgTop, 'orange')
      }

      // Finding 4: kicker → title gaps that differ between cards of one block.
      const gaps = []
      for (const k of kickers) {
        const km = metrics(k)
        const t = titles.find((el) => {
          const r = el.getBoundingClientRect()
          const kr = k.getBoundingClientRect()
          return r.top >= kr.bottom - 1 && r.top - kr.bottom < 40 && Math.abs(r.left - kr.left) < 4
        })
        const tm = t && metrics(t)
        if (km && tm) gaps.push({ k: km.text, gap: +(tm.capTop - km.baseline).toFixed(1), size: getComputedStyle(t).fontSize })
      }
      const bySize = {}
      for (const g of gaps) (bySize[g.size] ??= []).push(g)
      for (const [size, list] of Object.entries(bySize)) {
        const vals = list.map((g) => g.gap)
        if (Math.max(...vals) - Math.min(...vals) > TOLERANCE) out.push(`kicker→title gap varies for ${size} titles: ${list.map((g) => `${g.k}=${g.gap}`).join(', ')}`)
      }

      return { box: { x: rb.left + sx, y: rb.top + sy, width: rb.width, height: rb.height }, findings: out }
    },
    { i: target.i, TOLERANCE, NEAR_MISS_MAX },
  )

  const file = path.join(outDir, `${width}-${target.i}-${target.label}.png`)
  const b = result.box
  await page.screenshot({ path: file, fullPage: true, clip: { x: Math.max(0, b.x - 4), y: Math.max(0, b.y - 4), width: Math.min(b.width + 8, width), height: b.height + 8 } })
  await page.evaluate(() => document.querySelectorAll('[data-align-layer]').forEach((n) => n.remove()))

  console.log(`\n[${width}px] block ${target.i} ${target.label} -> ${file}`)
  if (result.findings.length === 0) console.log('  ok: nothing off by more than', TOLERANCE, 'px')
  for (const f of result.findings) {
    console.log('  -', f)
    findings.push({ block: target.i, label: target.label, finding: f })
  }
}

await browser.close()
console.log(`\n${findings.length} finding(s).`)
