import { getPayload } from 'payload'

import config from '@/payload.config'
import { CURATED_PAGES, CURATED_PAGE_KEYS } from '../main-homepage/pages'

export type ResetAllHomepageContentResult = {
  locationHomepagesCleared: number
}

export async function resetAllHomepageContent(): Promise<ResetAllHomepageContentResult> {
  const payload = await getPayload({ config })
  const locationHomepages = await payload.find({
    collection: 'location-homepages',
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })

  for (const homepage of locationHomepages.docs) {
    await payload.update({
      collection: 'location-homepages',
      id: homepage.id,
      // Drafts only: what readers see is never emptied from here.
      data: {
        pageBlocks: [],
        draftPageBlocks: [],
      },
      depth: 0,
      overrideAccess: true,
    })
  }

  // The main homepage and section pages keep their published blocks: emptying
  // them would blank questurian.com, which has no fallback. Only the editors'
  // drafts are cleared.
  for (const page of CURATED_PAGE_KEYS) {
    await payload.updateGlobal({
      slug: CURATED_PAGES[page].globalSlug,
      data: { draftPageBlocks: [] },
      depth: 0,
      overrideAccess: true,
    })
  }

  return {
    locationHomepagesCleared: locationHomepages.docs.length,
  }
}
