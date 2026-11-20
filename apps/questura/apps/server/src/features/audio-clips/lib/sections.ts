import { headingText } from '@/features/articles/public/headingAnchors'

/**
 * Article sections as the Narrator reads them (ADR-0018).
 *
 * An Article section runs from one H2 to the next; the text before the first
 * H2 is the Intro, keyed `intro`. A section is read as its heading, then its
 * prose: paragraphs, sub-headings and list items of the text blocks. Photos,
 * captions, pull quotes, boxes, carousels and every other block are skipped.
 *
 * Runs on the serialized, anchored HTML (`serializeArticleByCollection`), so a
 * section's key is the same `id` its heading carries on the page, the
 * Contents box links to, and the player is mounted under.
 */

export const INTRO_SECTION_KEY = 'intro'

/**
 * A standard article is read as one recording (ADR-0018, amended 2026-11-19):
 * title, byline, dek, then the whole body. Per-section keys stay for
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
    .split(/(?<=[.!?…])["”’)\]]?\s+(?=["“‘(¿¡]?[A-ZÁÉÍÓÚÑ0-9])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

/** A heading is read as its own sentence. */
function headingSentence(title: string): string {
  return /[.!?…:]$/.test(title) ? title : `${title}.`
}

export function sectionsFromBlocks(blocks: Array<Record<string, unknown>>): ArticleSection[] {
  const sections: ArticleSection[] = [{ key: INTRO_SECTION_KEY, title: 'Intro', sentences: [] }]
  let current = sections[0]

  for (const block of blocks) {
    const html =
      block.blockType === 'text'
        ? block.content
        : block.blockType === 'airbnb-card'
          ? block.stayContent
          : null
    if (typeof html !== 'string') continue

    for (const match of html.matchAll(READ_ELEMENT)) {
      const [, tag, attributes, inner] = match
      const text = headingText(inner)
      if (!text) continue
      if (tag === 'h2') {
        const key = ID_ATTRIBUTE.exec(attributes)?.[1]
        if (!key) continue
        current = { key, title: text, sentences: [headingSentence(text)] }
        sections.push(current)
        continue
      }
      if (tag === 'h3' || tag === 'h4') {
        current.sentences.push(headingSentence(text))
        continue
      }
      current.sentences.push(...splitSentences(text))
    }
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
 * The whole article as one reading: its title, who wrote it, the dek under the
 * title, then every section's sentences in page order.
 */
export function articleReading(input: {
  title: string
  authors: string[]
  dek: string | null | undefined
  blocks: Array<Record<string, unknown>>
}): ArticleSection {
  const sentences: string[] = []
  const title = input.title.replace(/\s+/g, ' ').trim()
  if (title) sentences.push(headingSentence(title))
  const byline = bylineSentence(input.authors)
  if (byline) sentences.push(byline)
  if (input.dek) sentences.push(...splitSentences(input.dek))
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
