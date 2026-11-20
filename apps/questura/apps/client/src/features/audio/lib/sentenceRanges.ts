import { ARTICLE_SECTION_KEY } from './slots'

/**
 * Finds each narrated sentence on the page, as a DOM Range (ADR-0018).
 *
 * The text is read straight from the rendered page. The whole-article
 * recording starts at the title (the byline and dek follow it) and runs to
 * the end; a section's runs from its H2 to the next. The players, ads,
 * figures, boxes and navigation are skipped. Each
 * sentence is then searched for in order, with spacing and curly quotes
 * evened out. A sentence that is not found (the text was edited after the
 * recording) gets no range and simply is not highlighted.
 *
 * Nothing in the article's markup changes: the highlight is a CSS Custom
 * Highlight drawn over these ranges.
 */

export type SentenceRanges = {
  ranges: Array<Range | null>
}

const SKIP = '[data-audio-slot], [data-in-article-ad], figure, aside, nav, script, style, button'

type Point = { node: Text; offset: number }

function normalizeChar(char: string): string {
  if (/\s/.test(char)) return ' '
  if (char === '’' || char === '‘' || char === 'ʼ') return "'"
  if (char === '“' || char === '”') return '"'
  if (char === '–' || char === '—') return '-'
  return char.toLowerCase()
}

function normalizeText(text: string): string {
  let out = ''
  for (const char of text) {
    const next = normalizeChar(char)
    if (next === ' ' && (out === '' || out.endsWith(' '))) continue
    out += next
  }
  return out.trim()
}

function sectionBounds(sectionKey: string): { start: Node; end: Node | null; root: Element } | null {
  if (sectionKey === ARTICLE_SECTION_KEY) {
    const start = document.querySelector('main h1') ?? document.querySelector('h1')
    return start ? { start, end: null, root: start.closest('main') ?? document.body } : null
  }
  const start = document.getElementById(sectionKey)
  if (!start) return null
  const root = start.closest('[data-article-body]') ?? document.body
  const headings = Array.from(root.querySelectorAll('h2[id]'))
  const end =
    headings.find(
      (heading) =>
        heading !== start && Boolean(start.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING),
    ) ?? null
  return { start, end, root }
}

export function buildSentenceRanges(sectionKey: string, sentences: string[]): SentenceRanges | null {
  const bounds = sectionBounds(sectionKey)
  if (!bounds) return null
  const { start, end, root } = bounds

  // The section's text, normalized, with a map back to the text nodes.
  let text = ''
  const points: Point[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const afterStart = start === node || Boolean(start.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) || start.contains(node)
    if (!afterStart) continue
    if (end && (end === node || end.contains(node) || Boolean(end.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING))) {
      // The heading that ends the section is outside it, except the section's own heading.
      if (end !== start) break
    }
    if (node.parentElement?.closest(SKIP)) continue
    const value = node.data
    for (let offset = 0; offset < value.length; offset += 1) {
      const next = normalizeChar(value[offset])
      if (next === ' ' && (text === '' || text.endsWith(' '))) continue
      text += next
      points.push({ node, offset })
    }
    // Block boundaries read as a space.
    if (!text.endsWith(' ')) {
      text += ' '
      points.push({ node, offset: value.length })
    }
  }

  let cursor = 0
  const ranges = sentences.map((sentence) => {
    const wanted = normalizeText(sentence)
    const candidates = [wanted, wanted.replace(/[.:!?]+$/, '')].filter(Boolean)
    for (const candidate of candidates) {
      const at = text.indexOf(candidate, cursor)
      if (at < 0) continue
      const from = points[at]
      const to = points[at + candidate.length - 1]
      if (!from || !to) continue
      cursor = at + candidate.length
      const range = document.createRange()
      range.setStart(from.node, from.offset)
      range.setEnd(to.node, Math.min(to.offset + 1, to.node.data.length))
      return range
    }
    return null
  })

  return { ranges }
}

/** Marks the paragraphs being narrated so the page can draw the blue rule beside them. Returns the undo. */
export function markNarratedBlocks(found: SentenceRanges): () => void {
  const marked = new Set<Element>()
  for (const range of found.ranges) {
    if (!range) continue
    const element = (range.startContainer.parentElement ?? null)?.closest('p, h2, h3, h4, li')
    if (element) marked.add(element)
  }
  for (const element of marked) element.setAttribute('data-audio-active', '')
  return () => {
    for (const element of marked) element.removeAttribute('data-audio-active')
  }
}
