import assert from 'node:assert/strict'
import test from 'node:test'
import { adFrameResponse } from './adFrameResponse.ts'
import { adFrameUrl } from './adUnits.ts'

const KEY = '0123456789abcdef0123456789abcdef'
const get = (path, method = 'GET') => adFrameResponse(new Request(`https://ads.questurian.com${path}`, { method }))

test('serves the banner document for a known size, framable only by the site', async () => {
  const res = get(`/frame?k=${KEY}&w=300&h=250`)
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type'), /text\/html/)
  // Cloudflare must not inject its analytics beacon into the ad document.
  assert.match(res.headers.get('cache-control'), /no-transform/)
  const ancestors = res.headers.get('content-security-policy')
  assert.match(ancestors, /^frame-ancestors /)
  assert.match(ancestors, /https:\/\/www\.questurian\.com/)
  const html = await res.text()
  assert.match(html, /"key":"0123456789abcdef0123456789abcdef","format":"iframe","height":250,"width":300/)
  assert.match(html, /src="https:\/\/www\.highperformanceformat\.com\/0123456789abcdef0123456789abcdef\/invoke\.js"/)
})

test('the site builds exactly the address the frame origin serves', async () => {
  const url = new URL(adFrameUrl({ key: KEY, width: 728, height: 90 }))
  assert.equal(url.origin, 'https://ads.questurian.com')
  const res = adFrameResponse(new Request(url))
  assert.equal(res.status, 200)
})

test('refuses sizes the site does not use, bad keys, other paths and writes', () => {
  assert.equal(get(`/frame?k=${KEY}&w=468&h=60`).status, 400)
  assert.equal(get(`/frame?k=${KEY}&w=300`).status, 400)
  assert.equal(get('/frame?k=%22%3E%3Cscript%3E&w=300&h=250').status, 400)
  assert.equal(get('/frame').status, 400)
  assert.equal(get('/').status, 404)
  assert.equal(get('/peru/lima').status, 404)
  assert.equal(get(`/frame?k=${KEY}&w=300&h=250`, 'POST').status, 405)
})

test('HEAD answers without a body', async () => {
  const res = get(`/frame?k=${KEY}&w=160&h=600`, 'HEAD')
  assert.equal(res.status, 200)
  assert.equal(await res.text(), '')
})

const region = (country, headers = {}, query = '') =>
  adFrameResponse(new Request(`https://ads.questurian.com/region${query}`, { headers }), country)

test('region: EU/EEA/UK/Swiss visitors must be asked, others not', async () => {
  for (const c of ['FR', 'DE', 'IE', 'GB', 'NO', 'CH']) {
    assert.deepEqual(await region(c).json(), { consentRequired: true }, c)
  }
  for (const c of ['US', 'PE', 'MX', 'CO', 'BR']) {
    assert.deepEqual(await region(c).json(), { consentRequired: false }, c)
  }
  assert.deepEqual(await region(undefined).json(), { consentRequired: true })
})

test('region: never cached, readable only by the site', () => {
  const site = region('US', { origin: 'https://www.questurian.com' })
  assert.equal(site.headers.get('cache-control'), 'private, no-store')
  assert.equal(site.headers.get('access-control-allow-origin'), 'https://www.questurian.com')
  assert.equal(region('US', { origin: 'https://evil.example' }).headers.get('access-control-allow-origin'), null)
})

test('region: a forced country can only make the site ask', async () => {
  assert.deepEqual(await region('US', {}, '?country=FR').json(), { consentRequired: true })
})
