/**
 * Runs the real check, in a real browser, against a small local site whose
 * pages are good or broken on purpose. `node --test scripts/check-map-pictures.test.mjs`
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { after, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'check-map-pictures.mjs')
// One white pixel.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
  'base64',
)
const section = (inner) => `<section aria-label="Members' map">${inner}</section>`
const PAGES = {
  '/peru/lima/maps/good': section('<img src="/map.png" alt="">'),
  '/peru/lima/itineraries/good': section('<img src="/map.png" alt="">'),
  '/peru/lima/maps/free': '<div class="gm-style"></div>',
  '/peru/lima/maps/dots': section('<svg></svg>'),
  '/peru/lima/maps/broken': section('<img src="/missing.png" alt="">'),
  '/peru/lima/maps/nothing': '<p>No map here.</p>',
}

function serve(paths) {
  const server = createServer((req, res) => {
    const path = new URL(req.url, 'http://x').pathname
    if (path === '/sitemap.xml') {
      const { port } = server.address()
      const urls = paths.map((p) => `<url><loc>http://127.0.0.1:${port}${p}</loc></url>`).join('')
      res.setHeader('Content-Type', 'application/xml')
      return res.end(`<urlset><url><loc>http://127.0.0.1:${port}/about</loc></url>${urls}</urlset>`)
    }
    if (path === '/map.png') {
      res.setHeader('Content-Type', 'image/png')
      return res.end(PNG)
    }
    if (PAGES[path] !== undefined) {
      res.setHeader('Content-Type', 'text/html')
      return res.end(`<!doctype html><html><body>${PAGES[path]}</body></html>`)
    }
    res.statusCode = 404
    res.end('not found')
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

function run(server) {
  const { port } = server.address()
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SCRIPT, '--site', `http://127.0.0.1:${port}`])
    let out = ''
    child.stdout.on('data', (chunk) => (out += chunk))
    child.stderr.on('data', (chunk) => (out += chunk))
    child.on('close', (code) => resolve({ code, out }))
  })
}

describe('check-map-pictures', { timeout: 300_000 }, () => {
  const servers = []
  const site = async (paths) => {
    const server = await serve(paths)
    servers.push(server)
    return run(server)
  }
  after(() => servers.forEach((server) => server.close()))

  it('passes pictures and free Google maps, and only looks at guides and itineraries', async () => {
    const { code, out } = await site(['/peru/lima/maps/good', '/peru/lima/itineraries/good', '/peru/lima/maps/free'])
    assert.equal(code, 0, out)
    assert.match(out, /3 pages on 2 screen sizes: 0 failed/)
    assert.doesNotMatch(out, /\/about/)
  })

  it('fails the dots drawing, a broken picture, a missing map and a missing page, and names each', async () => {
    const { code, out } = await site([
      '/peru/lima/maps/good',
      '/peru/lima/maps/dots',
      '/peru/lima/maps/broken',
      '/peru/lima/maps/nothing',
      '/peru/lima/maps/gone',
    ])
    assert.equal(code, 1, out)
    assert.match(out, /FAIL {2}desktop {2}\/peru\/lima\/maps\/dots {2}shows the dots drawing/)
    assert.match(out, /FAIL {2}phone {4}\/peru\/lima\/maps\/dots {2}shows the dots drawing/)
    assert.match(out, /\/peru\/lima\/maps\/broken {2}picture did not load/)
    assert.match(out, /\/peru\/lima\/maps\/nothing {2}no map on the page/)
    assert.match(out, /\/peru\/lima\/maps\/gone {2}HTTP 404/)
    assert.match(out, /ok {4}desktop {2}\/peru\/lima\/maps\/good/)
    assert.match(out, /5 pages on 2 screen sizes: 8 failed/)
  })

  it('fails when the sitemap lists nothing to check, rather than passing on nothing', async () => {
    const { code, out } = await site([])
    assert.equal(code, 1, out)
    assert.match(out, /lists no map guides or itineraries/)
  })
})
