import { headingText } from '@/features/articles/public/headingAnchors'

/**
 * What the Narrator reads (ADR-0018, reading rules settled with the owner
 * 2026-11-20):
 *
 * - Read: the title, "By" and every author, then the body in page order:
 *   paragraphs, headings (each as its own short sentence) and list items of the
 *   text blocks.
 * - Never read: the line under the title (the dek / meta description), hotel and
 *   Airbnb stay boxes (owner, 2026-11-20), photos,
 *   captions and credits, pull quotes, boxes, carousels, maps, Read more /
 *   Read next blocks, ads, the Contents box, and any paragraph or list item
 *   that is mostly links (a "More Lima guides" list, a "see also" line). A
 *   heading whose part ends up with nothing to read is dropped with it.
 *
 * An Article section runs from one H2 to the next; the text before the first
 * H2 is the Intro, keyed `intro`.
 *
 * Runs on the serialized, anchored HTML (`serializeArticleByCollection`), so a
 * section's key is the same `id` its heading carries on the page, the
 * Contents box links to, and the player is mounted under.
 */

export const INTRO_SECTION_KEY = 'intro'

/**
 * A standard article is read as one recording (ADR-0018, amended 2026-11-19):
 * title, byline, then the whole body (never the dek). Per-section keys stay for
 * listicles and itinerary stops later.
 */
export const ARTICLE_SECTION_KEY = 'article'

export type ArticleSection = {
  key: string
  title: string
  sentences: string[]
}

const READ_ELEMENT = /<(h2|h3|h4|p|li)((?:\s[^>]*)?)>([\s\S]*?)<\/\1>/g
const ID_ATTRIBUTE = /\sid="([^"]+)"/
const LINK = /<a\b[^>]*>([\s\S]*?)<\/a>/g

/** A paragraph or list item that is mostly link text is navigation, not prose. */
const LINK_SHARE_SKIPPED = 0.6

export function isMostlyLinks(innerHtml: string): boolean {
  const text = headingText(innerHtml).replace(/[\s·•|,;:–—-]+/g, '')
  if (!text) return false
  let linked = 0
  for (const match of innerHtml.matchAll(LINK)) linked += headingText(match[1]).replace(/[\s·•|,;:–—-]+/g, '').length
  return linked / text.length >= LINK_SHARE_SKIPPED
}


/**
 * Splits prose into sentences at a full stop, question or exclamation mark
 * followed by space and a capital, digit or opening quote. Prices like
 * "S/ 20." and decimals stay whole; a run that ends without punctuation is one
 * sentence.
 */
export function splitSentences(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  return clean
    // The full stop of "vs.", "Av.", "Jr.", "Dr." and the like does not end a sentence ("Barranco vs. Miraflores").
    .split(/(?<!\b(?:vs|Mr|Mrs|Ms|Dr|Av|Jr|Sr|Sra|approx)\.)(?<=[.!?…])["”’)\]]?\s+(?=["“‘(¿¡]?[A-ZÁÉÍÓÚÑ0-9])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

/** A heading is read as its own sentence. */
function headingSentence(title: string): string {
  return /[.!?…:]$/.test(title) ? title : `${title}.`
}

type ReadItem =
  | { kind: 'heading'; level: 2 | 3 | 4; key: string | null; text: string }
  | { kind: 'prose'; sentences: string[] }

/** The body's readable items in page order, links-only lines already left out. */
function readItems(blocks: Array<Record<string, unknown>>): ReadItem[] {
  const items: ReadItem[] = []
  for (const block of blocks) {
    // Only text blocks: a hotel or Airbnb stay box (`airbnb-card`) is not read.
    const html = block.blockType === 'text' ? block.content : null
    if (typeof html !== 'string') continue

    for (const match of html.matchAll(READ_ELEMENT)) {
      const [, tag, attributes, inner] = match
      const text = headingText(inner)
      if (!text) continue
      if (tag === 'h2' || tag === 'h3' || tag === 'h4') {
        const level = Number(tag[1]) as 2 | 3 | 4
        items.push({ kind: 'heading', level, key: level === 2 ? ID_ATTRIBUTE.exec(attributes)?.[1] ?? null : null, text })
        continue
      }
      if (isMostlyLinks(inner)) continue
      items.push({ kind: 'prose', sentences: splitSentences(text) })
    }
  }
  return dropEmptyHeadings(items)
}

/** A heading is read only if some prose follows it before the next heading of its level or higher. */
function dropEmptyHeadings(items: ReadItem[]): ReadItem[] {
  return items.filter((item, index) => {
    if (item.kind !== 'heading') return true
    for (const next of items.slice(index + 1)) {
      if (next.kind === 'prose') return true
      if (next.level <= item.level) return false
    }
    return false
  })
}

export function sectionsFromBlocks(blocks: Array<Record<string, unknown>>): ArticleSection[] {
  const sections: ArticleSection[] = [{ key: INTRO_SECTION_KEY, title: 'Intro', sentences: [] }]
  let current = sections[0]

  for (const item of readItems(blocks)) {
    if (item.kind === 'prose') {
      current.sentences.push(...item.sentences)
      continue
    }
    if (item.level === 2 && item.key) {
      current = { key: item.key, title: item.text, sentences: [headingSentence(item.text)] }
      sections.push(current)
      continue
    }
    current.sentences.push(headingSentence(item.text))
  }

  return sections.filter((section) => section.key !== INTRO_SECTION_KEY || section.sentences.length > 0)
}

/** "By A", "By A and B", "By A, B and C". */
export function bylineSentence(authors: string[]): string | null {
  const names = authors.map((name) => name.replace(/\s+/g, ' ').trim()).filter(Boolean)
  if (names.length === 0) return null
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  return `By ${list}.`
}

/**
 * The whole article as one reading: its title, who wrote it, then every
 * section's sentences in page order. The line under the title (the dek, which
 * is also the meta description) is never read: owner's rule, 2026-11-20.
 */
export function articleReading(input: {
  title: string
  authors: string[]
  blocks: Array<Record<string, unknown>>
}): ArticleSection {
  const sentences: string[] = []
  const title = input.title.replace(/\s+/g, ' ').trim()
  if (title) sentences.push(headingSentence(title))
  const byline = bylineSentence(input.authors)
  if (byline) sentences.push(byline)
  for (const section of sectionsFromBlocks(input.blocks)) sentences.push(...section.sentences)
  return { key: ARTICLE_SECTION_KEY, title: 'Whole article', sentences }
}

/** The text sent to the Narrator: sentences, one space apart. */
export function scriptFromSentences(sentences: string[]): string {
  return sentences.join(' ')
}

/**
 * Whether a clip still matches its section: its sentences must be the
 * section's first sentences, word for word. A clip may stop before the end of
 * its section (the first test clips do), so a shorter clip that matches is
 * current.
 */
export function clipMatchesSection(clipSentences: string[], sectionSentences: string[]): boolean {
  if (clipSentences.length === 0 || clipSentences.length > sectionSentences.length) return false
  const norm = (value: string) => value.replace(/\s+/g, ' ').trim()
  return clipSentences.every((sentence, index) => norm(sentence) === norm(sectionSentences[index]))
}
