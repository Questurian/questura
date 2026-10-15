import type { CityHomepageBlock, PhotoPileBlock } from '@/features/CityDashboard/types'

function isPhotoPile(block: CityHomepageBlock): block is PhotoPileBlock {
  return block.blockType === 'photo-pile'
}

/**
 * Splits a section page's blocks into its Photo Pile's ready photos (top of
 * the pile first) and the blocks that render under the masthead.
 */
export function photoPileOf(pageBlocks: CityHomepageBlock[]): {
  photos: string[]
  blocks: CityHomepageBlock[]
} {
  const pile = pageBlocks.find(isPhotoPile)
  const photos = (pile?.pilePhotos ?? []).flatMap((photo) =>
    photo.status === 'ready' && photo.url ? [photo.url] : [],
  )
  return { photos, blocks: pageBlocks.filter((block) => !isPhotoPile(block)) }
}
