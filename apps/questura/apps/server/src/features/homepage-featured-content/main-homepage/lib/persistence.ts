import { getPayload } from 'payload'

import config from '@/payload.config'
import type { PayloadInstance } from '@/types'

import { augmentBlocksWithPublishStatus } from '../../location-homepages/operations/publish-homepage'
import {
  formatHomepageDoc,
  resolvePageBlocks,
  type RawBlock,
} from '../../resolve-page-blocks/service'
import type { MainHomepageDoc } from '../types'
import { CURATED_PAGES, type CuratedPageKey } from '../pages'

export const MAIN_HOMEPAGE_LOCATION_GRID_SCOPE = {
  childLevel: 'city' as const,
  parentKey: null,
}

function rawBlocks(value: unknown): RawBlock[] {
  return Array.isArray(value) ? (value as RawBlock[]) : []
}

export function getDraftPageBlocks(doc: MainHomepageDoc): RawBlock[] {
  return rawBlocks(doc.draftPageBlocks)
}

export function getPublishedPageBlocks(doc: MainHomepageDoc): RawBlock[] {
  return rawBlocks(doc.publishedPageBlocks)
}

export async function getMainHomepagePayload(): Promise<PayloadInstance> {
  return getPayload({ config })
}

export async function loadMainHomepage(
  payload: PayloadInstance,
  page: CuratedPageKey = 'main',
): Promise<MainHomepageDoc> {
  return (await payload.findGlobal({
    slug: CURATED_PAGES[page].globalSlug,
    depth: 0,
    overrideAccess: true,
  })) as unknown as MainHomepageDoc
}

export async function updateMainHomepageDraft(
  payload: PayloadInstance,
  pageBlocks: unknown[],
  page: CuratedPageKey = 'main',
): Promise<MainHomepageDoc> {
  return (await payload.updateGlobal({
    slug: CURATED_PAGES[page].globalSlug,
    data: { draftPageBlocks: pageBlocks } as never,
    depth: 0,
    overrideAccess: true,
  })) as unknown as MainHomepageDoc
}

export async function resolveMainBlocks(payload: PayloadInstance, pageBlocks: RawBlock[]) {
  return resolvePageBlocks(payload, pageBlocks, MAIN_HOMEPAGE_LOCATION_GRID_SCOPE)
}

export async function formatMainHomepage(
  payload: PayloadInstance,
  doc: MainHomepageDoc,
  pageBlocks = getDraftPageBlocks(doc),
) {
  const publishedRaw = getPublishedPageBlocks(doc)
  const resolvedBlocks = await resolveMainBlocks(payload, pageBlocks)
  const resolvedPublished = await resolveMainBlocks(payload, publishedRaw)
  const augmentedBlocks = augmentBlocksWithPublishStatus(resolvedBlocks, pageBlocks, publishedRaw)

  return {
    ...formatHomepageDoc(
      {
        id: 1,
        isEnabled: true,
        location: null,
        lastPublishedAt: doc.lastPublishedAt,
        lastPublishedBy: doc.lastPublishedBy,
        publishedRevision: doc.publishedRevision,
      },
      augmentedBlocks,
      { publishedPageBlocks: resolvedPublished },
    ),
    id: 1,
    location: null,
  }
}

export async function updateAndFormatMainHomepageBlocks(
  payload: PayloadInstance,
  pageBlocks: unknown[],
  page: CuratedPageKey = 'main',
) {
  const updated = await updateMainHomepageDraft(payload, pageBlocks, page)
  return formatMainHomepage(payload, updated)
}
