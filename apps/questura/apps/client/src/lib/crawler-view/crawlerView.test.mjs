// The leak tests for the Google full-text view (ADR-0009, revised 2026-11-21).
//
// One sentence to defend: paid text leaves the Worker only for a request that
// is Googlebot by address AND by name, and that response is never storable.
// Every other case must hand back the very same response object it was given.
import assert from 'node:assert/strict'
import test from 'node:test'

import { isVerifiedGooglebot } from './googlebot.ts'
import { applyCrawlerView, withoutValidators } from './crawlerView.ts'

const PREFIXES = ['66.249.64.0/27', '2001:4860:4801:10::/64']
const GOOGLE_IP = '66.249.64.5'
const KEY = 'k'.repeat(48)
const PAID = '<p>THE PAID TEXT</p>'
const PAGE = 'https://www.questurian.com/peru/lima/maps/best-rooftop-bars-in-lima'

const PHONE =
  'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
const DESKTOP =
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/140.0.0.0 Safari/537.36'

const verified = (ip, userAgent) => isVerifiedGooglebot({ ip, userAgent }, PREFIXES)

test('Googlebot at a published address is verified', () => {
  for (const agent of [PHONE, DESKTOP, 'Googlebot/2.1 (+http://www.google.com/bot.html)']) {
    assert.equal(verified(GOOGLE_IP, agent), true)
  }
  assert.equal(verified('2001:4860:4801:10::2a', PHONE), true)
})

test('the name alone is never enough', () => {
  const addresses = ['203.0.113.9', '66.249.64.32', '66.249.63.255', '2001:4860:4801:11::1', '2a06:98c0:3600::103']
  for (const ip of addresses) assert.equal(verified(ip, PHONE), false, ip)
})

test('the address alone is never enough: public Google tools fetch from Google', () => {
  const agents = [
    'Mozilla/5.0 (compatible; Google-InspectionTool/1.0)',
    'Mozilla/5.0 (compatible; Google-InspectionTool/1.0; Googlebot/2.1)',
    'Mozilla/5.0 (compatible; GoogleOther)',
    'Googlebot-Image/1.0',
    'Mozilla/5.0 (Linux; Android 6.0.1) Chrome/140 Mobile Safari/537.36',
    '',
    null,
  ]
  for (const agent of agents) assert.equal(verified(GOOGLE_IP, agent), false, String(agent))
})

test('a malformed address fails closed', () => {
  const addresses = [
    null, '', 'unknown', '66.249.64', '66.249.64.5.1', '66.249.64.999', '066.249.64.5',
    '66.249.64.5, 203.0.113.9', '66.249.64.5:443', '::ffff:66.249.64.5', '2001:4860:4801:10:::1', 'g::1',
  ]
  for (const ip of addresses) assert.equal(verified(ip, PHONE), false, String(ip))
})

function setup({ url = PAGE, method = 'GET', headers = {}, key = KEY, page = {}, body } = {}) {
  const calls = []
  const request = new Request(url, {
    method,
    headers: { 'cf-connecting-ip': GOOGLE_IP, 'user-agent': PHONE, ...headers },
  })
  const response = new Response('PREVIEW', {
    status: page.status ?? 200,
    headers: {
      'content-type': page.type ?? 'text/html; charset=utf-8',
      'cache-control': 's-maxage=3600, stale-while-revalidate=604800',
      'cache-tag': 'article',
      etag: '"shared"',
    },
  })
  const deps = {
    prefixes: PREFIXES,
    key,
    loadBody: async (path, secret) => {
      calls.push({ path, secret })
      return body ? body() : PAID
    },
    rewrite: (_response, html) => new Response(html, { headers: _response.headers }),
  }
  return { calls, response, run: () => applyCrawlerView(request, response, deps) }
}

const untouched = {
  'an ordinary reader': { headers: { 'cf-connecting-ip': '203.0.113.9', 'user-agent': 'Safari' } },
  'a fake Googlebot': { headers: { 'cf-connecting-ip': '203.0.113.9' } },
  'a forged forwarded address': {
    headers: { 'cf-connecting-ip': '203.0.113.9', 'x-forwarded-for': GOOGLE_IP, 'x-real-ip': GOOGLE_IP },
  },
  'the public testing tool': { headers: { 'user-agent': 'Mozilla/5.0 (compatible; Google-InspectionTool/1.0)' } },
  'a subrequest from another Worker': { headers: { 'cf-worker': 'someone-else.example' } },
  'the switch off': { key: '' },
  'a key too short to be one': { key: 'short' },
  'a page loaded inside a frame': { headers: { 'sec-fetch-dest': 'iframe' } },
  'a page loaded by a script': { headers: { 'sec-fetch-dest': 'empty' } },
  'a request naming another origin': { headers: { origin: 'https://attacker.example' } },
  'a POST': { method: 'POST' },
  'a HEAD': { method: 'HEAD' },
  'a router payload request': { headers: { rsc: '1' } },
  'a router payload URL': { url: `${PAGE}?_rsc=abc` },
  'an API path': { url: 'https://www.questurian.com/api/health' },
  'an internal path': { url: 'https://www.questurian.com/_next/data/x/y' },
  'a 404': { page: { status: 404 } },
  'a redirect': { page: { status: 301 } },
  'a response that is not HTML': { page: { type: 'text/x-component' } },
}

for (const [name, options] of Object.entries(untouched)) {
  test(`${name} gets the preview, and the paid body is never even asked for`, async () => {
    const { calls, response, run } = setup(options)
    assert.equal(await run(), response)
    assert.equal(calls.length, 0)
  })
}

test('no body, or a failed read, leaves the preview exactly as it was', async () => {
  for (const body of [
    () => null,
    () => '',
    () => {
      throw new Error('API down')
    },
  ]) {
    const { response, run } = setup({ body })
    assert.equal(await run(), response)
  }
})

test('verified Googlebot gets the body, for the path it asked for', async () => {
  const { calls, run } = setup()
  assert.equal(await (await run()).text(), PAID)
  assert.deepEqual(calls, [{ path: '/peru/lima/maps/best-rooftop-bars-in-lima', secret: KEY }])
})

test('the full-text response can never be stored', async () => {
  const { response, run } = setup()
  const full = await run()
  for (const name of ['cache-control', 'cdn-cache-control', 'cloudflare-cdn-cache-control']) {
    assert.match(full.headers.get(name), /no-store/)
  }
  assert.doesNotMatch(full.headers.get('cache-control'), /s-maxage|public|stale-while-revalidate/)
  for (const name of ['cache-tag', 'etag', 'last-modified']) assert.equal(full.headers.get(name), null)
  assert.match(full.headers.get('x-robots-tag'), /noarchive/)
  // The shared response's own headers are not edited on the way.
  assert.match(response.headers.get('cache-control'), /s-maxage/)
})

test('a direct page visit still qualifies when the browser says so', async () => {
  const { run } = setup({ headers: { 'sec-fetch-dest': 'document' } })
  assert.equal(await (await run()).text(), PAID)
})

test("Googlebot's conditional request cannot be answered 304 with the old preview", () => {
  const conditional = { 'if-none-match': '"shared"', 'if-modified-since': 'Sat, 21 Nov 2026 00:00:00 GMT' }
  const bot = { 'cf-connecting-ip': GOOGLE_IP, 'user-agent': PHONE, ...conditional }
  const deps = { prefixes: PREFIXES, key: KEY }

  const stripped = withoutValidators(new Request(PAGE, { headers: bot }), deps)
  for (const name of Object.keys(conditional)) assert.equal(stripped.headers.get(name), null)

  const reader = new Request(PAGE, { headers: { ...bot, 'cf-connecting-ip': '203.0.113.9' } })
  assert.equal(withoutValidators(reader, deps), reader)
  const off = new Request(PAGE, { headers: bot })
  assert.equal(withoutValidators(off, { prefixes: PREFIXES, key: '' }), off)
})

// A route with a loading.tsx (itineraries) arrives as a skeleton in place and
// the real body in a hidden div at the end, moved by a script. With the
// scripts gone, the move has to have happened already.
const STREAMED =
  '<main><!--$?--><template id="B:0"></template><div aria-busy="true"><!--$-->skeleton<!--/$--></div><!--/$--></main>' +
  '<footer>foot</footer><div hidden id="S:0"><script type="application/ld+json">{"a":"<div>"}</script>' +
  `<div><!--$--><section class="paywalled">${PAID}</section><!--/$--></div></div><p>after</p>`

test('a streamed body is put in place, visible, with no script', async () => {
  const { run } = setup({ body: () => STREAMED })
  const html = await (await run()).text()
  assert.doesNotMatch(html, /hidden id="S:|id="B:|skeleton/)
  assert.ok(html.indexOf(PAID) < html.indexOf('</main>'), 'the body sits inside main, before the footer')
  assert.ok(html.endsWith('<footer>foot</footer><p>after</p>'))
})

test('a streamed body that cannot be placed leaves the preview', async () => {
  for (const broken of [
    '<div hidden id="S:0"><p>never closed',
    '<div hidden id="S:0"><p>no boundary for it</p></div>',
    '<main><!--$?--><template id="B:0"></template>no end</main><div hidden id="S:0"><p>x</p></div>',
  ]) {
    const { response, run } = setup({ body: () => broken })
    const out = await run()
    assert.equal(out, response)
    assert.equal(await out.text(), 'PREVIEW', 'and the preview is still readable')
  }
})
