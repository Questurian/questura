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
