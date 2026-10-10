import { publicArticleGridFourLayout } from '../../article-grid/service'
import {
  publicFeaturedArticlesSlot3Layout,
  publicFeaturedArticlesSlot4Layout,
  publicFeaturedArticlesSlot5Layout,
} from '../../featured-articles/lib/slot-layouts'
import { publicCreatorKicker } from '../../featured-creator-article/creator-kicker'
import { PUBLIC_ARTICLE_BLOCK_TYPES } from '../constants'
import { formatPublicArticleItem } from './format-public-article'
import { isRecord } from './guards'
import { normalizeTotalSlots, stringOrNull } from './normalize'

type LocationContext = { country: string; city: string }

export function formatPublicHomepageBlock(block: unknown, location?: LocationContext) {
  if (!isRecord(block) || !PUBLIC_ARTICLE_BLOCK_TYPES.has(String(block.blockType))) {
    return block
  }

  const selection = isRecord(block.selection) ? block.selection : null
  if (selection?.isComplete === false) {
    return null
  }

  const rawItems = Array.isArray(selection?.items) ? selection.items : []
  const blockType = String(block.blockType)
  const totalSlots = normalizeTotalSlots(selection?.totalSlots)

  const base = {
    blockType,
    totalSlots,
    sectionHeading: stringOrNull(block.sectionHeading),
    sectionSubheading: stringOrNull(block.sectionSubheading),
    items: rawItems.map((item) => formatPublicArticleItem(item, location)),
  }

  if (blockType === 'editorial-feature') {
    const linkedLocation =
      isRecord(block.linkedLocation) && stringOrNull(block.linkedLocation.href)
        ? {
            id: block.linkedLocation.id,
            label: stringOrNull(block.linkedLocation.label),
            locationKey: stringOrNull(block.linkedLocation.locationKey),
            href: stringOrNull(block.linkedLocation.href),
          }
        : null
    return {
      ...base,
      featureKicker: stringOrNull(block.featureKicker),
      featureTitle: stringOrNull(block.featureTitle),
      featureDescription: stringOrNull(block.featureDescription),
      featureImagePortrait: block.featureImagePortrait ?? null,
      featureImageWide: block.featureImageWide ?? null,
      linkedLocation,
    }
  }

  if (blockType === 'author-feature') {
    return {
      ...base,
      imageStyle: stringOrNull(block.imageStyle) ?? 'portrait',
      motionStyle: stringOrNull(block.motionStyle) ?? 'subtle',
      authorCard: isRecord(block.authorCard) ? block.authorCard : null,
    }
  }

  if (blockType === 'featured-creator-article') {
    const creatorKicker = publicCreatorKicker(block)
    return creatorKicker ? { ...base, creatorKicker } : base
  }

  if (blockType === 'featured-articles') {
    // Each helper returns null unless the block has its slot count, so at most
    // one of these keys is sent.
    const slot3Layout = publicFeaturedArticlesSlot3Layout(block, totalSlots)
    const slot4Layout = publicFeaturedArticlesSlot4Layout(block, totalSlots)
    const slot5Layout = publicFeaturedArticlesSlot5Layout(block, totalSlots)
    if (slot3Layout) return { ...base, slot3Layout }
    if (slot4Layout) return { ...base, slot4Layout }
    if (slot5Layout) return { ...base, slot5Layout }
    return base
  }

  const articleGridFourLayout =
    blockType === 'article-grid' ? publicArticleGridFourLayout(block, totalSlots) : null

  if (articleGridFourLayout) {
    return { ...base, articleGridFourLayout }
  }

  return base
}
