/**
 * Itinerary intro drop cap, on every itinerary (owner, 2026-11-07).
 *
 * The first letter of the intro's first paragraph is drawn as a bold ink
 * letter in a page-coloured square with a fine ink edge and a solid blue block
 * set down and right behind it, three lines tall (CSS `.drop-cap` in
 * article-prose-and-media.css). The letter is an SVG so it can be centred on
 * its ink rather than on the font's text box: each capital sits in a 100 x 100
 * box at the x, baseline y and font size below, measured from Playfair
 * Display 700 (cap height 0.6 of the plate, ink at most 66 wide, so W and M
 * shrink to keep their side margins).
 */

/** [x, baseline y, font size] in the plate's 100 x 100 viewBox. */
const GLYPHS: Record<string, readonly [number, number, number]> = {
  A: [22.1, 80, 84.7], B: [21.4, 80, 84.7], C: [20.7, 80, 84.7], D: [17.6, 80, 84.7],
  E: [23.6, 80, 84.7], F: [24.5, 80, 84.7], G: [18, 80, 84.7], H: [16.1, 80, 84.7],
  I: [34.1, 80, 84.7], J: [36.7, 80, 84.7], K: [17.9, 80, 84.7], L: [23.6, 80, 84.7],
  M: [14.3, 77.2, 76.8], N: [19.2, 80, 84.7], O: [16.4, 80, 84.7], P: [22.3, 80, 84.7],
  Q: [15.1, 80, 84.7], R: [18.4, 80, 84.7], S: [24.7, 80, 84.7], T: [21.7, 80, 84.7],
  U: [20.8, 80, 84.7], V: [21.8, 80, 84.7], W: [17.8, 73.7, 67], X: [20.1, 80, 84.7],
  Y: [24.1, 80, 84.7], Z: [24.8, 80, 84.7],
  '0': [22.7, 80, 84.7], '1': [33.3, 80, 84.7], '2': [27.8, 80, 84.7], '3': [29.6, 80, 84.7],
  '4': [28.6, 80, 84.7], '5': [30.7, 80, 84.7], '6': [25.5, 80, 84.7], '7': [29.8, 80, 84.7],
  '8': [26.1, 80, 84.7], '9': [27.1, 80, 84.7],
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function dropCapMarkup(letter: string): string {
  const glyph = GLYPHS[letter]
  // Letters outside the table (accented capitals, say) centre on their box.
  const text = glyph
    ? `<text x="${glyph[0]}" y="${glyph[1]}" font-size="${glyph[2]}">`
    : '<text x="50" y="80" font-size="84.7" text-anchor="middle">'
  const safe = escapeText(letter)
  return (
    '<span class="drop-cap" aria-hidden="true">' +
    `<svg viewBox="0 0 100 100" focusable="false">${text}${safe}</text></svg>` +
    `</span><span class="sr-only">${safe}</span>`
  )
}

/**
 * Swaps the first letter of the first paragraph in `html` for the drop cap.
 * Leaves the HTML alone when there is no paragraph or it opens with something
 * other than a letter or digit (a quote mark, an entity, an image).
 */
export function withDropCap(html: string): string {
  const paragraph = html.search(/<p[\s>]/i)
  if (paragraph < 0) return html

  let index = html.indexOf('>', paragraph) + 1
  if (index === 0) return html

  // Step over inline tags that open the paragraph (<a>, <strong>, <em>).
  while (index < html.length) {
    const char = html[index]
    if (char === '<') {
      if (html.startsWith('</p', index)) return html
      const end = html.indexOf('>', index)
      if (end < 0) return html
      index = end + 1
      continue
    }
    if (/\s/.test(char)) {
      index += 1
      continue
    }
    break
  }

  const [letter] = Array.from(html.slice(index, index + 2))
  if (!letter || !/^[\p{L}\p{N}]$/u.test(letter)) return html

  return html.slice(0, index) + dropCapMarkup(letter) + html.slice(index + letter.length)
}
