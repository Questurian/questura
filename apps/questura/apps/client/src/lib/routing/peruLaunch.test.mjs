import assert from 'node:assert/strict'
import test from 'node:test'

async function loadPolicy(backendUrl) {
  const previous = process.env.NEXT_PUBLIC_BACKEND_URL
  process.env.NEXT_PUBLIC_BACKEND_URL = backendUrl
  try {
    return await import(`./peruLaunch.ts?backend=${encodeURIComponent(backendUrl)}`)
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_BACKEND_URL
    else process.env.NEXT_PUBLIC_BACKEND_URL = previous
  }
}

test('the public site keeps the five landing pages, Lima articles and reader routes', async () => {
  const { isPublicPageEnabled, publicLocationHref } = await loadPolicy('https://api.questurian.com')

  for (const path of ['/', '/eat', '/stay', '/itineraries', '/peru/lima',
    '/peru/lima/guides/questurian-guide-lima', '/articles/older-guide-url',
    '/account/bookmarks', '/purchase/monthly', '/newsletters/confirm', '/about', '/contact']) {
    assert.equal(isPublicPageEnabled(path), true, path)
  }
  for (const path of ['/peru', '/peru/paracas', '/colombia/medellin', '/mexico/mexico-city',
    '/articles', '/articles/page/2', '/newsletters']) {
    assert.equal(isPublicPageEnabled(path), false, path)
  }
  assert.equal(publicLocationHref('peru'), '/')
  assert.equal(publicLocationHref('peru|lima|barranco'), '/peru/lima')
  assert.equal(publicLocationHref('colombia|medellin'), null)
})

test('Medellín map guides are open while the rest of Medellín stays offline', async () => {
  const { isPublicPageEnabled } = await loadPolicy('https://api.questurian.com')
  assert.equal(isPublicPageEnabled('/colombia/medellin/maps/best-rooftop-bars-medellin'), true)
  for (const path of ['/colombia/medellin', '/colombia/medellin/maps', '/colombia/medellin/maps/',
    '/colombia/medellin/maps/a/b', '/colombia/medellin/food-and-drink/some-article',
    '/colombia/bogota/maps/best-rooftop-bars-bogota', '/mexico/mexico-city/maps/some-guide']) {
    assert.equal(isPublicPageEnabled(path), false, path)
  }
})

test('an isolated test backend can still serve fixture destinations', async () => {
  const { isPublicPageEnabled, publicLocationHref } = await loadPolicy('http://api.readiness.localhost:4100')
  assert.equal(isPublicPageEnabled('/zz-launch/harbor/food-and-drink/launch-article-00'), true)
  assert.equal(publicLocationHref('zz-launch|harbor'), '/zz-launch/harbor')
})
