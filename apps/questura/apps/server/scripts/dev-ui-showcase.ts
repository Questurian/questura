/**
 * Write the "UI Showcase" articles into the LOCAL database: one standard
 * article per display layout (classic, dark-hero, centered), each using every
 * article block and every text format, so the article UI can be checked on
 * http://localhost:3000 in one place.
 *
 * Why a script: the local content tables are a copy of live and `db:refresh`
 * (run by `pnpm dev` every 6 h) replaces them, so a showcase made by hand in
 * the local admin disappears. Run this again after a refresh. It never goes
 * through the AI Blog Writer: the studio writes to the live API.
 *
 * Local only. It refuses any database that is not on this machine.
 *
 *   pnpm dev:showcase           # (re)create the three articles, print their URLs
 *   pnpm dev:showcase --remove  # delete them
 *
 * Photos, Airbnbs and hotels are borrowed from the copied content (the Lima
 * ocean-view stays article when present), so nothing new is uploaded.
 */
import 'dotenv/config'
import { getPayload, type Where } from 'payload'

import config from '../src/payload.config'
import { devToolsRefusal } from '../src/features/dev-tools/membership-states'

const LAYOUTS = [
  { layout: 'classic', label: 'Classic layout' },
  { layout: 'dark-hero', label: 'Dark hero layout' },
  { layout: 'centered', label: 'Centered layout' },
] as const

const SLUG_PREFIX = 'ui-showcase-'
const SOURCE_SLUG = 'best-places-stay-lima-ocean-views'

type Payload = Awaited<ReturnType<typeof getPayload>>
type Doc = Record<string, unknown> & { id: number }
type Block = Record<string, unknown> & { blockType: string }

// --- Lexical builders: the node shapes Payload's default editor stores. ---

const BOLD = 1
const ITALIC = 2
const STRIKE = 4
const UNDERLINE = 8
const CODE = 16
const SUB = 32
const SUP = 64

const element = { direction: 'ltr', format: '', indent: 0, version: 1 }

const t = (text: string, format = 0) => ({ type: 'text', text, format, detail: 0, mode: 'normal', style: '', version: 1 })
const link = (text: string, url: string, newTab = false) => ({
  ...element,
  type: 'link',
  version: 3,
  fields: { url, newTab, linkType: 'custom' },
  children: [t(text)],
})
type Inline = ReturnType<typeof t> | ReturnType<typeof link> | { type: 'linebreak'; version: 1 }
const br = { type: 'linebreak', version: 1 } as const
const p = (...children: Inline[]) => ({ ...element, type: 'paragraph', textFormat: 0, textStyle: '', children })
const h = (tag: 'h2' | 'h3' | 'h4', text: string) => ({ ...element, type: 'heading', tag, children: [t(text)] })
const quote = (...children: Inline[]) => ({ ...element, type: 'quote', children })
const list = (kind: 'bullet' | 'number', items: Inline[][]) => ({
  ...element,
  type: 'list',
  listType: kind,
  tag: kind === 'number' ? 'ol' : 'ul',
  start: 1,
  children: items.map((children, index) => ({ ...element, type: 'listitem', value: index + 1, children })),
})
const hr = { type: 'horizontalrule', version: 1 }
const text = (...children: unknown[]): Block => ({
  blockType: 'text',
  content: { root: { ...element, type: 'root', children } },
})

const LOREM =
  'Lima rewards the unhurried. Mornings belong to the malecón, afternoons to long lunches, and evenings to whichever neighborhood you have not yet walked. This paragraph is filler so the reading column has the length of a real article, which is what ad placement and the paywall fade measure.'

function localOnly() {
  const refusal = devToolsRefusal({ NODE_ENV: process.env.NODE_ENV, databaseUri: process.env.DATABASE_URI })
  if (refusal) {
    console.error(`Refusing: ${refusal}. This script only writes the local database.`)
    process.exit(2)
  }
}

const idOf = (value: unknown): number | null =>
  typeof value === 'number' ? value : value && typeof value === 'object' && 'id' in value ? Number((value as Doc).id) : null

async function sourceArticle(payload: Payload): Promise<Doc> {
  const tries: Where[] = [{ slug: { equals: SOURCE_SLUG } }, { status: { equals: 'published' } }]
  for (const where of tries) {
    const found = await payload.find({ collection: 'articles', where, limit: 1, depth: 0, overrideAccess: true })
    if (found.docs[0]) return found.docs[0] as unknown as Doc
  }
  throw new Error('No published article to borrow a location, category and photos from. Run pnpm db:refresh.')
}

async function mediaIds(payload: Payload, width: number, height: number, count: number): Promise<number[]> {
  const found = await payload.find({
    collection: 'media-assets',
    where: { and: [{ width: { equals: width } }, { height: { equals: height } }] },
    sort: '-createdAt',
    limit: count,
    depth: 0,
    overrideAccess: true,
  })
  if (found.docs.length < count) throw new Error(`Need ${count} photos at ${width}x${height}, found ${found.docs.length}`)
  return found.docs.map((doc) => Number(doc.id))
}

/** Cards of one type from the source article, falling back to any saved ones. */
async function stayIds(
  payload: Payload,
  source: Doc,
  blockType: string,
  field: string,
  collection: 'airbnbs' | 'accommodations',
  count: number,
) {
  const blocks = (source.contentBlocks as Block[] | undefined) ?? []
  const ids = blocks.filter((b) => b.blockType === blockType).map((b) => idOf(b[field])).filter((id): id is number => id !== null)
  if (ids.length >= count) return ids.slice(0, count)
  const found = await payload.find({ collection, limit: count, depth: 0, overrideAccess: true })
  return found.docs.map((doc) => Number(doc.id))
}

async function titleOf(payload: Payload, collection: 'airbnbs' | 'accommodations', id: number, field: string) {
  const doc = (await payload.findByID({ collection, id, depth: 0, overrideAccess: true })) as unknown as Doc
  return String(doc[field] ?? doc.title ?? doc.name ?? `Stay ${id}`)
}

async function buildBlocks(payload: Payload, source: Doc): Promise<Block[]> {
  const header = (source.headerSection ?? {}) as Doc
  const heroId = idOf(header.featuredImage)
  const [pairOne, pairTwo] = await mediaIds(payload, 1200, 1500, 2)
  const square = await mediaIds(payload, 1080, 1080, 3)
  const landscape = await mediaIds(payload, 1920, 1080, 3)
  const airbnbs = await stayIds(payload, source, 'airbnb-card', 'airbnb', 'airbnbs', 2)
  // The first hotel shows the lone card; the rest, side by side, the carousel.
  const [loneHotel, ...carouselHotels] = await stayIds(payload, source, 'hotel-card', 'hotel', 'accommodations', 5)
  const airbnbTitles = await Promise.all(airbnbs.map((id) => titleOf(payload, 'airbnbs', id, 'title')))
  const readMorePath = typeof source.canonicalPath === 'string' ? source.canonicalPath : '/'

  const stays: Block[] = airbnbs.flatMap((id, index) => [
    text(
      h('h2', airbnbTitles[index]),
      p(t(`Stay box ${index + 1}. This heading names the Airbnb, so the section moves into its box at render time (stayBoxes.ts). `), t('Bold inside the box.', BOLD)),
    ),
    { blockType: 'airbnb-card', airbnb: id },
  ])

  return [
    text(
      p(
        t('This article exists to show every UI element a standard article can draw. Text formats: '),
        t('bold', BOLD), t(', '), t('italic', ITALIC), t(', '), t('underline', UNDERLINE), t(', '),
        t('strikethrough', STRIKE), t(', '), t('inline code', CODE), t(', '), t('bold italic', BOLD | ITALIC),
        t(', H'), t('2', SUB), t('O and E = mc'), t('2', SUP), t('. Links: '),
        link('an internal link', readMorePath), t(', '), link('an external link in a new tab', 'https://www.example.com', true),
        t('.'),
      ),
      p(t('A line break follows.'), br, t('This line came after it.')),
    ),
    {
      blockType: 'key-takeaway',
      label: 'Key takeaways',
      items: [
        { text: 'Key takeaway items take **markdown bold** and *italic*.' },
        { text: 'They can hold [a link](https://www.example.com) too.' },
        { text: 'Three or four items is the usual length.' },
        { text: 'A fourth, longer item checks how the list wraps when a single takeaway runs well past one line on a phone.' },
      ],
    },
    text(
      h('h2', 'Headings, lists and quotes'),
      p(t(LOREM)),
      h('h3', 'A third-level heading'),
      p(t('A bulleted list:')),
      list('bullet', [[t('First bullet')], [t('Second bullet with '), t('bold', BOLD)], [t('Third bullet with '), link('a link', readMorePath)]]),
      p(t('A numbered list:')),
      list('number', [[t('Step one')], [t('Step two')], [t('Step three')]]),
      h('h4', 'A fourth-level heading'),
      quote(t('A block quote written in the rich-text editor, not the pull-quote block.')),
      p(t('A horizontal rule follows.')),
      hr,
      p(t(LOREM)),
    ),
    ...(heroId ? [{ blockType: 'image', image: heroId, altText: 'Showcase single image', caption: 'Image block caption.' }] : []),
    text(p(t(LOREM))),
    { blockType: 'pull-quote', quote: 'A pull quote: one line worth **remembering**, set large in the column.' },
    text(p(t(LOREM))),
    {
      blockType: 'in-the-know',
      label: 'In the know',
      text: 'An in-the-know aside. It renders **markdown**, *italics* and [links](https://www.example.com).',
    },
    { blockType: 'img-pair', imageOne: pairOne, imageTwo: pairTwo, caption: 'Img pair caption (two 1200x1500 portraits).' },
    text(p(t(LOREM))),
    { blockType: 'img-trio', format: 'square', imageOne: square[0], imageTwo: square[1], imageThree: square[2], caption: 'Img trio, square format.' },
    text(p(t(LOREM))),
    { blockType: 'img-trio', format: 'landscape', imageOne: landscape[0], imageTwo: landscape[1], imageThree: landscape[2], caption: 'Img trio, landscape format.' },
    text(h('h2', 'Where to stay'), p(t('Airbnb boxes come next. Each box takes in the heading and prose written right above it.'))),
    ...stays,
    text(h('h2', 'A single hotel'), p(t('One Hotel Card on its own draws as a card: photo beside the details.'))),
    ...(loneHotel ? [{ blockType: 'hotel-card', hotel: loneHotel }] : []),
    text(h('h2', 'Hotels side by side'), p(t('Two or more Hotel Cards in a row draw as one carousel (hotelRuns.ts).'))),
    ...carouselHotels.map((id) => ({ blockType: 'hotel-card', hotel: id })),
    { blockType: 'read-more', title: 'Read more: the article these stays came from', url: readMorePath },
    text(p(t(LOREM))),
    {
      blockType: 'faq',
      label: 'Frequently asked questions',
      items: [
        { question: 'What is this article?', answer: 'A local-only showcase of every article block. It is not on the live site.' },
        { question: 'Do answers take markdown?', answer: 'Yes: **bold**, *italic* and [links](https://www.example.com).' },
        { question: 'Where does it go after a refresh?', answer: 'db:refresh replaces local content. Run `pnpm dev:showcase` again.' },
      ],
    },
    text(h('h2', 'Closing'), p(t(LOREM))),
  ]
}

async function removeExisting(payload: Payload) {
  const removed = await payload.delete({
    collection: 'articles',
    where: { slug: { like: SLUG_PREFIX } },
    overrideAccess: true,
  })
  return removed.docs.length
}

async function main() {
  localOnly()
  const payload = await getPayload({ config })
  const removed = await removeExisting(payload)
  if (process.argv.includes('--remove')) {
    console.log(`Removed ${removed} showcase article(s).`)
    process.exit(0)
  }

  const source = await sourceArticle(payload)
  const header = (source.headerSection ?? {}) as Doc
  const contentBlocks = await buildBlocks(payload, source)

  for (const { layout, label } of LAYOUTS) {
    const created = (await payload.create({
      collection: 'articles',
      overrideAccess: true,
      data: {
        step1_complete: true,
        in_update_mode: false,
        title: `UI Showcase: ${label}`,
        slug: `${SLUG_PREFIX}${layout}`,
        location: source.location,
        locationRef: idOf(source.locationRef),
        category: idOf(source.category),
        author: idOf(source.author),
        headerSection: {
          featuredImage: idOf(header.featuredImage),
          featuredMediaSet: idOf(header.featuredMediaSet),
        },
        contentBlocks,
        seoSection: {
          metaDescription: 'Local-only showcase of every standard article block and text format, for checking the article UI.',
          robots: { index: 'noindex', follow: 'nofollow' },
        },
        status: 'published',
        language: 'en',
        access: 'free',
        displayLayout: layout,
      } as never,
    })) as unknown as Doc
    console.log(`${label.padEnd(17)} http://localhost:3000${created.canonicalPath}`)
  }
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
