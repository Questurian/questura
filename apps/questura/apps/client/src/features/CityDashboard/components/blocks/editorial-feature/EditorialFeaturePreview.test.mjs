import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(
  new URL('./EditorialFeaturePreview.tsx', import.meta.url),
  'utf8'
)

test('editorial feature reserves full-width divider rules for tablet and desktop', () => {
  // Owner, 2026-10-28: the copy column is not boxed by rules at any width.
  assert.doesNotMatch(source, /copyRule/)
  assert.doesNotMatch(source, /justify-center[^"`]*border-y/)

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

test('a linked destination title reads as a link at rest: underline plus link mark', () => {
  assert.match(source, /import \{ ExternalLink \} from 'lucide-react'/)
  // Resting underline in the title's own colour (both themes); offset and
  // thickness match the global headline hover rule, so hover changes nothing.
  assert.match(source, /group\/title underline decoration-from-font underline-offset-\[0\.14em\]/)
  assert.equal(source.match(/titleLink: 'decoration-current'/g)?.length, 2)
  // The mark takes the title's own colour, centred on the underlined word.
  assert.match(source, /<ExternalLink[\s\S]*?className="relative -top-\[0\.025em\] [^"]*align-middle"/)
  assert.doesNotMatch(source, /titleIcon/)
  // No href, no link styling: the title renders as plain text.
  assert.match(source, /\{featureHref \? \([\s\S]*?<ExternalLink[\s\S]*?\) : \(\s*block\.featureTitle\s*\)\}/)
})
