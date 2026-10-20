import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatListicleAddressLabel,
  formatPriceTier,
  plainTextExcerpt,
} from './listicleVenueFormatters.ts'

test('price tiers render as ticks, and ticks pass through', () => {
  assert.equal(formatPriceTier('3'), '$$$')
  assert.equal(formatPriceTier('$$'), '$$')
  assert.equal(formatPriceTier('0'), '')
  assert.equal(formatPriceTier(3), '')
})

test('markup is stripped and whitespace collapsed', () => {
  assert.equal(
    plainTextExcerpt('<p>Great <strong>brunch</strong></p>\n<p>and coffee</p>'),
    'Great brunch and coffee',
  )
})

test('entities are decoded, not left raw', () => {
  assert.equal(plainTextExcerpt('<p>Bar &amp; grill &#39;til late</p>'), "Bar & grill 'til late")
})

test('non-strings are empty, never "undefined"', () => {
  assert.equal(plainTextExcerpt(null), '')
  assert.equal(plainTextExcerpt(undefined), '')
  assert.equal(plainTextExcerpt(42), '')
})

test('long copy is clipped on a word boundary with an ellipsis', () => {
  const excerpt = plainTextExcerpt('one two three four five six seven eight', 20)
  assert.ok(excerpt.endsWith('...'))
  assert.ok(excerpt.length <= 23)
  assert.ok(!excerpt.includes('  '))
  assert.ok('one two three four five six seven eight'.startsWith(excerpt.slice(0, -3)))
})

test('short copy is returned whole, with no ellipsis', () => {
  assert.equal(plainTextExcerpt('Short and sweet', 160), 'Short and sweet')
})

test('the address is read out of a Location Manager search link, without the venue name', () => {
  assert.equal(
    formatListicleAddressLabel(
      'https://www.google.com/maps/search/?api=1&query=El%20Mercado%2C%20Av.%20Hip%C3%B3lito%20Unanue%20203%2C%20Miraflores',
      'El Mercado',
    ),
    'Av. Hipólito Unanue 203, Miraflores',
  )
})

test('links that carry no address give no address, never the link itself', () => {
  for (const link of [
    'https://maps.app.goo.gl/AbCdEf123',
    'https://maps.google.com/?cid=1234567890',
    'https://www.google.com/maps/@-12.12,-77.03,17z',
    'https://www.google.com/maps/place/?q=place_id:ChIJ123',
    'https://www.google.com/maps/search/?api=1&query=Cala%2C%20https%3A%2F%2Fmaps.app.goo.gl%2FAbC',
    'https://www.google.com/maps/search/?api=1&query=Cala',
    'https://www.google.com/maps/place/Cala/@-12.15,-77.02,17z',
  ]) {
    assert.equal(formatListicleAddressLabel(link, 'Cala'), null, link)
  }
})

test('a plain-text address passes through', () => {
  assert.equal(formatListicleAddressLabel('  Jr. Batallón Callao 123,   Lima ', 'Cala'), 'Jr. Batallón Callao 123, Lima')
})
