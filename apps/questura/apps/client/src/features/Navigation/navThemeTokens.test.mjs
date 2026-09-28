import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const read = (relative) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8')

const css = read('../../app/styles/global/foundations.css')

const block = (selector) => {
  const start = css.indexOf(`${selector} {\n  --nav-bg`)
  assert.notEqual(start, -1, `no navbar palette under ${selector}`)
  return css.slice(start, css.indexOf('}', start))
}
const tokens = (text) => [...text.matchAll(/(--nav-[a-z-]+):/g)].map((m) => m[1]).sort()

/**
 * The navbar has one layout and two palettes (light = the lab's Atlantic 100,
 * dark = Atlantic 150). They stay one design only while every colour comes
 * from the palette: a colour typed straight into a component shows in one
 * theme and is wrong in the other.
 */
test('light and dark define the same navbar tokens', () => {
  const light = tokens(block(':root'))
  const dark = tokens(block('html[data-nav-theme="dark"] .site-nav'))
  assert.ok(light.length > 10)
  assert.deepEqual(dark, light)
})

test('every colour token is registered as a Tailwind colour', () => {
  // Tailwind v4 has no config here: an unregistered `bg-nav-*` compiles to nothing.
  for (const name of tokens(block(':root'))) {
    if (name === '--nav-shadow-strength') continue // a number, used in an inline style
    assert.match(css, new RegExp(`--color-${name.slice(2)}: var\\(${name}\\);`), `${name} is not in @theme`)
  }
})

test('the themed navbar files take every colour from the palette', () => {
  const THEMED = [
    './Desktop/DesktopNavbar.tsx',
    './Mobile/MobileNavbar.tsx',
    './shared/components/Logo.tsx',
    './shared/components/icons/UserIcon.tsx',
  ]
  const literal = /\b(?:bg|text|border|ring|from|to|via)-(?:\[#|black\b|white\b|(?:stone|gray|neutral|zinc|slate)-\d)/
  // The member badge is its own navy disc with a gold edge, the same on either
  // bar, so its white "Q" is not a navbar colour.
  const withoutMemberBadge = (source) => source.replace(/\{isMember \? \([\s\S]*?\) : \(/, '')
  for (const path of THEMED) {
    const source = withoutMemberBadge(read(path))
    const hit = source.match(literal)
    assert.equal(hit, null, `${path} hardcodes ${hit?.[0]}; use a --nav-* token so both themes get it`)
  }
})

test('the palette is scoped to the navbar root', () => {
  assert.match(read('./Navbar.tsx'), /className="site-nav /)
})
