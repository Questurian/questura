import assert from 'node:assert/strict'
import test from 'node:test'
import {
  coveredHeight,
  hiddenBelowFold,
  INITIAL_LISTICLE_MAP_MODE,
  sheetHeightPx,
  sheetTopForMode,
  splitVisibleHeight,
} from './ListicleMapModes.ts'

// An iPhone in Safari: 80px of toolbars that hide while scrolling down.
const PHONE = { small: 720, large: 800 }
const DESKTOP = { small: 800, large: 800 }
const NAVBAR = 64

test('phones land in split, so the map is on screen from the start', () => {
  assert.equal(INITIAL_LISTICLE_MAP_MODE, 'split')
})

test('the sheet is the large viewport tall, so hiding the toolbars never uncovers the page under it', () => {
  assert.equal(sheetHeightPx(PHONE), PHONE.large)
  for (const mode of ['split', 'map']) {
    assert.ok(sheetTopForMode(mode, PHONE, NAVBAR) + sheetHeightPx(PHONE) >= PHONE.large)
  }
})

test('list parks the whole sheet below even the tallest viewport', () => {
  assert.equal(sheetTopForMode('list', PHONE), PHONE.large)
  assert.equal(coveredHeight('list', PHONE), 0)
})

test('split never shows more than its share of the screen, toolbars or not', () => {
  assert.equal(splitVisibleHeight(PHONE), 336)
  // Toolbars hidden: exactly the share.
  assert.equal(PHONE.large - sheetTopForMode('split', PHONE), 336)
  // Toolbars showing: they cover the bottom of it.
  assert.equal(PHONE.small - sheetTopForMode('split', PHONE), 256)
  assert.equal(sheetTopForMode('split', DESKTOP), 800 - 336)
})

test('split leaves most of the screen to the article', () => {
  for (const viewport of [PHONE, DESKTOP]) {
    assert.ok(sheetTopForMode('split', viewport) > viewport.large / 2)
  }
})

test('the takeover stops under the navbar so it is always reachable', () => {
  assert.equal(sheetTopForMode('map', PHONE, NAVBAR), NAVBAR)
  // Split is low enough to clear the navbar on its own.
  assert.equal(
    sheetTopForMode('split', PHONE, NAVBAR),
    sheetTopForMode('split', PHONE),
  )
})

test('the camera aims above what the toolbars hide', () => {
  // Desktop has no toolbars: the takeover hides only the navbar's worth.
  assert.equal(hiddenBelowFold('map', DESKTOP, NAVBAR), NAVBAR)
  assert.equal(hiddenBelowFold('map', PHONE, NAVBAR), NAVBAR + 80)
  assert.equal(hiddenBelowFold('split', PHONE), 464 + 80)
})

test('split pads the page by the most the sheet can ever cover', () => {
  assert.equal(coveredHeight('split', PHONE), 336)
  assert.equal(coveredHeight('split', DESKTOP), 336)
})
