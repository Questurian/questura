/**
 * Heading anchors and the Contents list for a standard article.
 *
 * Every H2 and H3 in the article's text blocks gets an `id` made from its
 * text, so any section can be linked (`…/guide-to-lima#staying-safe`). When
 * the article has `showTableOfContents` on, the H2s also become the Contents
 * list the page draws under its header.
 *
 * Runs on the serialized HTML, after the Lexical conversion and before the
 * paywall trims the blocks: the blocks convert in parallel, so numbering a
 * repeated heading needs one ordered pass over the finished HTML, and the
 * list has to name the parts a non-member cannot read yet. Only heading
 * titles go out for those, never their text.
 */

export type TableOfContentsEntry = {
  id: string
  title: string
}

const HEADING_PATTERN = /<(h[23])((?:\s[^>]*)?)>([\s\S]*?)<\/\1>/g

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&nbsp;': ' ',
}

/** The reader-visible text of a heading's inner HTML. */
export function headingText(innerHtml: string): string {
  return innerHtml
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:amp|lt|gt|quot|nbsp|#39|#x27);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, ' ')
    .trim()
}

/** "Where to stay in Barranco & Miraflores" -> "where-to-stay-in-barranco-miraflores". */
export function slugifyHeading(text: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
  return slug || 'section'
}

/**
 * Adds an `id` to every H2 and H3 in the article's text blocks, in reading
 * order, and returns the H2s as the Contents list. A repeated title gets
 * `-2`, `-3`, … so every anchor on the page is unique. A heading that already
 * carries an `id` keeps it.
 */
export function anchorArticleHeadings(
  blocks: Array<Record<string, unknown>>,
): TableOfContentsEntry[] {
  const used = new Map<string, number>()
  const entries: TableOfContentsEntry[] = []

  const uniqueId = (base: string) => {
    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)
    return seen === 0 ? base : `${base}-${seen + 1}`
  }

  for (const block of blocks) {
    if (block.blockType !== 'text' || typeof block.content !== 'string') continue

    block.content = block.content.replace(
      HEADING_PATTERN,
      (match: string, tag: string, attributes: string, inner: string) => {
        if (/\sid\s*=/.test(attributes)) return match
        const title = headingText(inner)
        if (!title) return match
        const id = uniqueId(slugifyHeading(title))
        if (tag === 'h2') entries.push({ id, title })
        return `<${tag} id="${id}"${attributes}>${inner}</${tag}>`
      },
    )
  }

  return entries
}
