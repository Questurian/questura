import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(
  new URL('./EditorialFeaturePreview.tsx', import.meta.url),
  'utf8'
)

test('editorial feature reserves full-width divider rules for tablet and desktop', () => {
  assert.doesNotMatch(source, /justify-center border-y /)
  assert.match(source, /justify-center \$\{tone\.copyRule\}[^"`]*768:border-y/)

  assert.doesNotMatch(source, /gap-4 border-t /)
  assert.match(source, /gap-4 \$\{tone\.railRule\}[^"`]*768:border-t/)
  assert.match(source, /768:pt-6/)
})

test('dark theme inverts onto the article-header ink band', () => {
  assert.match(source, /dark: \{\s*band: 'bg-foreground /)
  assert.match(source, /kicker: 'text-accent-soft'/)
  // No near-white surfaces: the dark band's image ground stays translucent.
  assert.doesNotMatch(source, /bg-white['\s]/)
})

test('the flag comes from the local flag set, never a remote URL', () => {
  assert.match(source, /<CountryFlag\s/)
  assert.doesNotMatch(source, /https?:\/\/[^'"`]*flag/i)
})

test('the feature image never grows past its grid track', () => {
  // 4:5 on a stretched row widened the image over the copy column.
  assert.doesNotMatch(source, /768:aspect-\[4\/5\]/)
  assert.match(source, /aspect-\[16\/10\] min-w-0 [^"`]*768:aspect-auto/)
})
