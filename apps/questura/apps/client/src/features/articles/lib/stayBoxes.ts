/**
 * Stay boxes: an Airbnb Card and the section written about it, read as one box.
 *
 * Owner decision, 2026-10-20: on a "best Airbnbs" article each stay is one
 * box (photos, name, write-up, facts and link together), the way a Condé Nast
 * Traveler gallery reads. The write-up already exists: the AI Blog Writer
 * splits the body at its headings, and a card picked there lands right after
 * the block it was added under. So nothing new is authored or stored. At render
 * time each card takes in the section written beside it, heading and prose,
 * and that section leaves the reading column.
 *
 * Which side is "beside": the section above, because that is where the writer
 * puts a card. A card moved above its section is still matched, because every
 * heading is compared with its stay's title and the side that names the stays
 * better wins for the whole article. A lone Airbnb in a wider article only
 * takes a section whose heading names it, so a "Where to stay" section never
 * disappears into a box.
 *
 * Dependency-free on purpose (see `adPlacement`): `pnpm test` runs this through
 * `node --experimental-strip-types`.
 */

import { splitProse, type ProseSegment } from './adPlacement.ts'

/** The section a box took in. */
export type StayLead = {
  /** Inner HTML of the section heading; it becomes the box title. */
  headingHtml: string
  /** The heading's level, so the box keeps the article's outline. */
  level: 2 | 3
  /** The prose under the heading. Empty when the section was a heading alone. */
  html: string
  /**
   * Whether the heading names the stay. When it does not ("Best for a long
   * stay"), the box is titled with the Airbnb's own name and keeps the heading
   * as its angle.
   */
  namesStay: boolean
}

/** Where a box sits among the article's Airbnbs, for its number. */
export type StayPosition = { index: number; total: number }

/** The shape this module needs. `ContentBlock` structurally satisfies it. */
export type StayPairableBlock = {
  blockType: string
  content?: string
  airbnb?: { title: string } | null
}

/** A card the pairing has looked at. */
export type StayBoxFields = {
  lead: StayLead | null
  /** Null when the article has a single Airbnb: one box is not a list. */
  position: StayPosition | null
}

type Section = { heading: number; end: number }

type Candidate = { blockIndex: number; section: Section; score: number }

/**
 * How closely a heading must name its stay to count as naming it. A lone card
 * only takes a section whose heading does.
 */
const NAME_MATCH = 0.5

const STOPWORDS = new Set([
  'a', 'an', 'and', 'at', 'by', 'for', 'from', 'in', 'is', 'near', 'of', 'on', 'or', 'our',
  'the', 'this', 'to', 'with', 'your', 'de', 'del', 'el', 'en', 'la', 'las', 'los', 'y',
])

function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
}

function tokens(text: string): Set<string> {
  return new Set(
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token && !STOPWORDS.has(token)),
  )
}

/**
 * Share of the shorter name's words the other one has too. "1. The two bedroom
 * on Malecón de la Marina" and "Two bedroom on Malecon de la Marina" score 1.
 */
export function headingMatch(heading: string, title: string): number {
  const a = tokens(plainText(heading))
  const b = tokens(title)
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const token of a) if (b.has(token)) shared += 1
  return shared / Math.min(a.size, b.size)
}

/** The heading level a block's sections are cut at: its h2s, else its h3s. */
function sectionTag(segments: ProseSegment[]): 'h2' | 'h3' | null {
  if (segments.some((segment) => segment.tag === 'h2')) return 'h2'
  if (segments.some((segment) => segment.tag === 'h3')) return 'h3'
  return null
}

/** A block's last section: its last heading through the end of the block. */
function lastSection(segments: ProseSegment[]): Section | null {
  const tag = sectionTag(segments)
  if (!tag) return null
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    if (segments[index].tag === tag) return { heading: index, end: segments.length }
  }
  return null
}

/** A block's first section, when the block opens on a heading: up to the next heading of its rank. */
function firstSection(segments: ProseSegment[]): Section | null {
  const tag = segments[0]?.tag
  if (tag !== 'h2' && tag !== 'h3') return null
  const closes = (other: string | null) => other === 'h2' || (tag === 'h3' && other === 'h3')
  let end = segments.length
  for (let index = 1; index < segments.length; index += 1) {
    if (closes(segments[index].tag)) {
      end = index
      break
    }
  }
  return { heading: 0, end }
}

/**
 * A heading's own list number, dropped: "3. Clifftop Duplex" reads "Clifftop
 * Duplex" in a box that already shows "03 / 05". A year or a name that starts
 * with a number ("1950s flat") keeps it.
 */
export function withoutListNumber(html: string): string {
  return html.replace(/^(\s*(?:<[^>]+>\s*)*)\d{1,2}\s*[.):]\s+/, '$1')
}

function innerHtml(html: string): string {
  return html.replace(/^\s*<h[23][^>]*>/i, '').replace(/<\/h[23]>\s*$/i, '')
}

/**
 * Pairs every published Airbnb Card with the section written beside it.
 *
 * Returns a new list: a card carries `lead` (the section it took in) and
 * `position`, and the text block it took from keeps whatever else it held,
 * or drops out when nothing is left. Other blocks pass through untouched.
 * Pair before planning ads, so the plan indexes the blocks that are drawn.
 */
export function pairStayBoxes<T extends StayPairableBlock>(blocks: T[]): Array<T | (T & StayBoxFields)> {
  const cards = blocks.flatMap((block, index) =>
    block.blockType === 'airbnb-card' && block.airbnb ? [index] : [],
  )
  if (cards.length === 0) return blocks

  const segmentCache = new Map<number, ProseSegment[]>()
  const segmentsOf = (index: number): ProseSegment[] => {
    let segments = segmentCache.get(index)
    if (!segments) {
      const block = blocks[index]
      segments =
        block?.blockType === 'text' && typeof block.content === 'string'
          ? splitProse(block.content)
          : []
      segmentCache.set(index, segments)
    }
    return segments
  }

  const candidate = (cardIndex: number, side: -1 | 1): Candidate | null => {
    const blockIndex = cardIndex + side
    if (blocks[blockIndex]?.blockType !== 'text') return null
    const segments = segmentsOf(blockIndex)
    const section = side === -1 ? lastSection(segments) : firstSection(segments)
    if (!section) return null
    const title = blocks[cardIndex].airbnb?.title ?? ''
    return { blockIndex, section, score: headingMatch(segments[section.heading].html, title) }
  }

  const above = cards.map((index) => candidate(index, -1))
  const below = cards.map((index) => candidate(index, 1))
  const score = (list: Array<Candidate | null>) => list.reduce((sum, c) => sum + (c?.score ?? 0), 0)
  const count = (list: Array<Candidate | null>) => list.filter(Boolean).length
  const useBelow =
    score(below) > score(above) || (score(below) === score(above) && count(below) > count(above))
  const chosen = useBelow ? below : above
  const isList = cards.length > 1

  const taken = new Map<number, Section>()
  const leads = new Map<number, StayLead>()
  cards.forEach((cardIndex, k) => {
    const pick = chosen[k]
    if (!pick || taken.has(pick.blockIndex)) return
    if (!isList && pick.score < NAME_MATCH) return
    const segments = segmentsOf(pick.blockIndex)
    const heading = segments[pick.section.heading]
    taken.set(pick.blockIndex, pick.section)
    leads.set(cardIndex, {
      headingHtml: innerHtml(heading.html),
      level: heading.tag === 'h3' ? 3 : 2,
      html: segments
        .slice(pick.section.heading + 1, pick.section.end)
        .map((segment) => segment.html)
        .join(''),
      namesStay: pick.score >= NAME_MATCH,
    })
  })

  let boxNumber = 0
  return blocks.flatMap((block, index): Array<T | (T & StayBoxFields)> => {
    const section = taken.get(index)
    if (section) {
      const segments = segmentsOf(index)
      const rest = [...segments.slice(0, section.heading), ...segments.slice(section.end)]
        .map((segment) => segment.html)
        .join('')
      return rest.trim() ? [{ ...block, content: rest }] : []
    }
    if (block.blockType === 'airbnb-card' && block.airbnb) {
      boxNumber += 1
      return [
        {
          ...block,
          lead: leads.get(index) ?? null,
          position: isList ? { index: boxNumber, total: cards.length } : null,
        },
      ]
    }
    return [block]
  })
}
