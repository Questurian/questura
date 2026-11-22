import { applySampleRule } from './freeSample'
import type { ArticleCollectionSlug } from './serializeArticleBlocks'

/**
 * The withheld text of a Gated item, as plain HTML, for Google's full-text
 * view (ADR-0009, revised 2026-11-21).
 *
 * An allowlist, like the Free sample: words only. No coordinates, addresses,
 * phone numbers, photos, audio or stored JSON-LD, and a block type added
 * later is left out until somebody adds it here. It is a subset of what a
 * member sees, never something a member would not see.
 *
 * Takes a document `serializeArticleByCollection` has already run over, so
 * rich text is already the HTML the member's page draws.
 */

type Row = Record<string, unknown>

function rows(value: unknown): Row[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is Row => Boolean(entry) && typeof entry === 'object')
}

/** Already-serialized rich text. */
function html(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Plain editorial text, which may carry a little markdown. */
function text(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .trim()
}

function element(tag: 'h2' | 'h3' | 'p' | 'li' | 'blockquote', value: string): string {
  return value ? `<${tag}>${value}</${tag}>` : ''
}

function articleBlock(block: Row): string {
  switch (block.blockType) {
    case 'text':
      return html(block.content)
    case 'airbnb-card':
      return html(block.stayContent)
    case 'key-takeaway': {
      const items = rows(block.items).map((item) => element('li', text(item.text))).join('')
      return items ? `<ul>${items}</ul>` : ''
    }
    case 'pull-quote':
      return element('blockquote', text(block.quote))
    case 'in-the-know':
      return element('p', text(block.text))
    case 'faq':
      return rows(block.items)
        .map((item) => element('h3', text(item.question)) + element('p', text(item.answer)))
        .join('')
    default:
      return ''
  }
}

function place(row: Row): string {
  const venue = row.item && typeof row.item === 'object' ? (row.item as Row).title : row.title
  const name = [text(row.activityTitle), text(venue)].filter(Boolean).join(': ')
  return element('h3', name) + html(row.blurb)
}

function articleBody(doc: Row): string {
  const blocks = rows(doc.contentBlocks)
  // What the preview already shows, by the rule that decides the preview.
  const sample: Row = { contentBlocks: structuredClone(blocks) }
  applySampleRule('articles', sample)
  const shown = new Set(rows(sample.contentBlocks).map((block) => block.id))

  return blocks
    .filter((block) => block.id === undefined || !shown.has(block.id))
    .map(articleBlock)
    .join('')
}

function listicleBody(doc: Row): string {
  const intro = html((doc.header as Row | undefined)?.intro)
  const sample: Row = { header: { intro }, items: [] }
  applySampleRule('single-type-listicles', sample)
  const shownIntro = html((sample.header as Row).intro)

  // Whole paragraphs the preview already shows are not said twice.
  const rest = (intro.match(/<p\b[^>]*>[\s\S]*?<\/p>/g) ?? []).filter((paragraph) => !shownIntro.includes(paragraph))

  let section = ''
  const places = rows(doc.items).map((row) => {
    const next = text(row.section)
    const heading = next && next !== section ? element('h2', next) : ''
    section = next
    return heading + place(row)
  })
  return rest.join('') + places.join('')
}

function itineraryBody(doc: Row): string {
  const days = rows(doc.itineraryDays)
  if (days.length === 0) return rows(doc.items).map(place).join('')

  return days
    .map(
      (day, index) =>
        element('h2', `Day ${index + 1}`) + [...rows(day.whereStaying), ...rows(day.items)].map(place).join(''),
    )
    .join('')
}

export function buildCrawlerBody(collection: ArticleCollectionSlug, doc: Row): string {
  if (collection === 'articles') return articleBody(doc)
  if (collection === 'single-type-listicles') return listicleBody(doc)
  return itineraryBody(doc)
}
