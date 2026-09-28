import assert from 'node:assert/strict'
import test from 'node:test'

import { applyNavTheme, NAV_THEME_KEY, NAV_THEME_SCRIPT, readNavTheme, setNavTheme } from './navTheme.ts'

function memoryStorage() {
  const map = new Map()
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)) }
}

const throwing = {
  getItem() {
    throw new Error('SecurityError')
  },
  setItem() {
    throw new Error('QuotaExceededError')
  },
}

test('light unless dark was saved', () => {
  const storage = memoryStorage()
  assert.equal(readNavTheme(storage), 'light')
  storage.setItem(NAV_THEME_KEY, 'purple')
  assert.equal(readNavTheme(storage), 'light')
  storage.setItem(NAV_THEME_KEY, 'dark')
  assert.equal(readNavTheme(storage), 'dark')
  assert.equal(readNavTheme(null), 'light')
})

test('setNavTheme saves the choice and marks <html> only for dark', () => {
  const storage = memoryStorage()
  const root = { dataset: {} }
  setNavTheme('dark', storage, root)
  assert.equal(storage.getItem(NAV_THEME_KEY), 'dark')
  assert.equal(root.dataset.navTheme, 'dark')
  setNavTheme('light', storage, root)
  assert.equal(storage.getItem(NAV_THEME_KEY), 'light')
  assert.equal('navTheme' in root.dataset, false)
})

test('blocked storage still repaints the page and never throws', () => {
  const root = { dataset: {} }
  assert.equal(readNavTheme(throwing), 'light')
  assert.doesNotThrow(() => setNavTheme('dark', throwing, root))
  assert.equal(root.dataset.navTheme, 'dark')
  assert.doesNotThrow(() => applyNavTheme('dark', null))
})

test('the pre-paint script agrees with readNavTheme', () => {
  for (const [saved, expected] of [[null, undefined], ['light', undefined], ['dark', 'dark'], ['junk', undefined]]) {
    const storage = memoryStorage()
    if (saved) storage.setItem(NAV_THEME_KEY, saved)
    const document = { documentElement: { dataset: {} } }
    new Function('localStorage', 'document', NAV_THEME_SCRIPT)(storage, document)
    assert.equal(document.documentElement.dataset.navTheme, expected, `saved=${saved}`)
  }
  // Storage that throws leaves the page light instead of breaking <head>.
  const document = { documentElement: { dataset: {} } }
  assert.doesNotThrow(() => new Function('localStorage', 'document', NAV_THEME_SCRIPT)(throwing, document))
  assert.equal(document.documentElement.dataset.navTheme, undefined)
})
