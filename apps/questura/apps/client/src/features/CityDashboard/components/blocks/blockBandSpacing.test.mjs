import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const css = read('../../../../app/styles/global/featured-articles-shared-and-seven.css')

// Below 1024 the featured layouts drop their top inset and lean on the
// padding of the block above. After a band of another colour that padding is
// on the band, so the lead photo met the colour change with nothing between.
// Every place the opening block gets its inset back, the block after a band
// must get it too.
test('a featured block after a colour band gets the opening-block inset', () => {
  const openingSelectors = css
    .split('\n')
    .filter((line) => line.includes('[data-blocks-open-page] > section:first-of-type'))
  assert.ok(openingSelectors.length > 0, 'the opening-block rules are gone')
  for (const line of openingSelectors) {
    assert.match(
      line,
      /:is\(\[data-blocks-open-page\] > section:first-of-type, \[data-block-band\] \+ section\)/,
      `opening-block selector without its band twin: ${line.trim()}`,
    )
  }
})

test('a band after a featured block gets paper above it too', () => {
  assert.match(
    css,
    /section:has\(> \[class\*="city-featured-"\]\) \+ \[data-block-band\],\s*section\.city-featured-seven-layout \+ \[data-block-band\] \{\s*margin-top: calc\(var\(--block-gutter\) - 16px\);/,
  )
})

// The blocks whose root band paints something other than the page's paper.
// A new one belongs here and must mark itself, or the block after it is back
// to touching the colour change on phones.
const BAND_BLOCKS = {
  'editorial-feature/EditorialFeaturePreview.tsx': /band=\{tone === TONES\.dark\}/,
  'questurian-maps-dark/QuesturianMapsDarkPreview.tsx': /band=\{theme === 'blue'\}/,
  'questurian-maps/QuestUrianMapsPreviewContent.tsx': /<BlockSection[^>]*\bband\b/,
  'featured-article/FeaturedArticleOneArticlePreview.tsx': /<section[^>]*data-block-band=""/,
}

test('blocks that paint their own band say so', () => {
  for (const [path, marker] of Object.entries(BAND_BLOCKS)) {
    assert.match(read(path), marker, `${path} no longer marks its band`)
  }
  assert.match(read('BlockSection.tsx'), /data-block-band=\{band \|\| undefined\}/)
})
