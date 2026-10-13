import type { Payload } from 'payload'

import { normalizeHomepageFeaturedRef } from '../../featured-articles/service'
import type { HomepageFeaturedCollection } from '../../featured-articles/types'
import type { LocationHomepageDoc, RawBlock } from '../../resolve-page-blocks/service'
import { CURATED_PAGES, CURATED_PAGE_KEYS, type CuratedPageKey } from '../../main-homepage/pages'

type HomepageReference = {
  homepageId: number | CuratedPageKey
  scope: 'draft' | 'published' | 'legacy'
  blockIndex: number
  blockType: string
  slot: number
}

const SCAN_FIELDS = [
  ['draft', 'draftPageBlocks'],
  ['published', 'publishedPageBlocks'],
  ['legacy', 'pageBlocks'],
] as const

function blockRefs(block: RawBlock): Array<{ slot: number; ref: ReturnType<typeof normalizeHomepageFeaturedRef> }> {
  if (!Array.isArray(block.items)) return []
  return block.items.map((item, index) => ({
    slot: index + 1,
    ref: normalizeHomepageFeaturedRef(item),
  }))
}

function collectReferences(
  docs: LocationHomepageDoc[],
  relationTo: HomepageFeaturedCollection,
  id: string | number,
  scopes: ReadonlySet<'draft' | 'published' | 'legacy'>,
): HomepageReference[] {
  const refs: HomepageReference[] = []
  const targetId = String(id)

  for (const doc of docs) {
    for (const [scope, fieldName] of SCAN_FIELDS) {
      if (!scopes.has(scope)) continue

      const blocks = doc[fieldName] as RawBlock[] | undefined
      if (!Array.isArray(blocks)) continue

      blocks.forEach((block, blockIndex) => {
        for (const item of blockRefs(block)) {
          if (item.ref?.relationTo === relationTo && String(item.ref.id) === targetId) {
            refs.push({
              homepageId: doc.id,
              scope,
              blockIndex: blockIndex + 1,
              blockType: block.blockType,
              slot: item.slot,
            })
          }
        }
      })
    }
  }

  return refs
}

function describeReferences(refs: HomepageReference[]): string {
  return refs
    .map((ref) =>
      `homepage ${ref.homepageId} ${ref.scope} block ${ref.blockIndex} (${ref.blockType}) slot ${ref.slot}`,
    )
    .join('; ')
}

async function loadHomepagesForReferenceScan(payload: Payload): Promise<LocationHomepageDoc[]> {
  const result = await payload.find({
    collection: 'location-homepages',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    select: {
      id: true,
      location: true,
      pageBlocks: true,
      draftPageBlocks: true,
      publishedPageBlocks: true,
    },
  })

  return result.docs as unknown as LocationHomepageDoc[]
}

function curatedPageBlocks(doc: unknown, field: 'draftPageBlocks' | 'publishedPageBlocks'): RawBlock[] {
  const value = (doc as Record<string, unknown> | null)?.[field]
  return Array.isArray(value) ? (value as RawBlock[]) : []
}

/** The main homepage and the navbar section pages, each tagged with its page key as id. */
async function loadCuratedPagesForReferenceScan(payload: Payload): Promise<LocationHomepageDoc[]> {
  const docs = await Promise.all(
    CURATED_PAGE_KEYS.map(async (page) => {
      try {
        const doc = await payload.findGlobal({
          slug: CURATED_PAGES[page].globalSlug,
          depth: 0,
          overrideAccess: true,
        })

        return [{
          id: page as unknown as number,
          draftPageBlocks: curatedPageBlocks(doc, 'draftPageBlocks'),
          publishedPageBlocks: curatedPageBlocks(doc, 'publishedPageBlocks'),
        }]
      } catch {
        return []
      }
    }),
  )

  return docs.flat() as unknown as LocationHomepageDoc[]
}

export async function assertCanDeleteHomepageFeaturedContent(
  payload: Payload,
  relationTo: HomepageFeaturedCollection,
  id: string | number,
): Promise<void> {
  const docs = [
    ...await loadHomepagesForReferenceScan(payload),
    ...await loadCuratedPagesForReferenceScan(payload),
  ]
  const refs = collectReferences(
    docs,
    relationTo,
    id,
    new Set(['draft', 'published', 'legacy']),
  )

  if (refs.length > 0) {
    throw new Error(
      `Cannot delete ${relationTo} #${id}; remove it from curated homepages first: ${describeReferences(refs)}.`,
    )
  }
}

export async function assertCanUnpublishHomepageFeaturedContent(
  payload: Payload,
  relationTo: HomepageFeaturedCollection,
  id: string | number,
): Promise<void> {
  const docs = [
    ...await loadHomepagesForReferenceScan(payload),
    ...await loadCuratedPagesForReferenceScan(payload),
  ]
  const refs = collectReferences(docs, relationTo, id, new Set(['published', 'legacy']))

  if (refs.length > 0) {
    throw new Error(
      `Cannot unpublish ${relationTo} #${id}; it is used by a published curated homepage: ${describeReferences(refs)}.`,
    )
  }
}

export type HomepagesFeaturing = {
  mainHomepage: boolean
  /** Navbar section pages (eat, stay, itineraries) whose published blocks show it. */
  sectionPages: Exclude<CuratedPageKey, 'main'>[]
  locationHomepages: LocationHomepageDoc[]
}

/**
 * Every live homepage that shows this article. A homepage card reads the
 * article's title and cover when the homepage renders, so the homepage's
 * cached page goes stale the moment the article changes — not only when the
 * homepage itself is saved. Draft blocks are skipped: nobody sees them.
 */
export async function findHomepagesFeaturing(
  payload: Payload,
  relationTo: HomepageFeaturedCollection,
  id: string | number,
): Promise<HomepagesFeaturing> {
  const live = new Set(['published', 'legacy'] as const)
  const locationDocs = await loadHomepagesForReferenceScan(payload)
  const curatedDocs = await loadCuratedPagesForReferenceScan(payload)

  const locationIds = new Set(
    collectReferences(locationDocs, relationTo, id, live).map((ref) => ref.homepageId),
  )

  const curatedPages = new Set(
    collectReferences(curatedDocs, relationTo, id, live).map((ref) => ref.homepageId),
  )

  return {
    mainHomepage: curatedPages.has('main'),
    sectionPages: CURATED_PAGE_KEYS.filter(
      (page): page is Exclude<CuratedPageKey, 'main'> => page !== 'main' && curatedPages.has(page),
    ),
    locationHomepages: locationDocs.filter((doc) => locationIds.has(doc.id)),
  }
}
