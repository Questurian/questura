import type { GateState } from '@/features/articles/lib/gate'
import type { StayLead, StayPosition } from '@/features/articles/lib/stayBoxes'

export type ImageAttributionData = {
  photographer_credit?: string | null
  edit_credit?: string | null
  sources?: { position: string; title?: string | null; credit: string; url?: string | null }[] | null
}

export type MediaAsset = ImageAttributionData & {
  id: number
  url: string
  alt_text?: string
  /** The set this variant belongs to; its credit fields win over the asset's copy. */
  mediaSet?: ImageAttributionData & { alt_text?: string }
}

export type TextBlock = {
  id: string
  blockType: 'text'
  content: string
}

export type ImageBlock = {
  id: string
  blockType: 'image'
  image: MediaAsset
  altText?: string
  caption?: string
}

export type ImgPairBlock = {
  id: string
  blockType: 'img-pair'
  imageOne: MediaAsset
  imageTwo: MediaAsset
  caption?: string
}

export type ImgTrioBlock = {
  id: string
  blockType: 'img-trio'
  format: 'square' | 'landscape'
  imageOne: MediaAsset
  imageTwo: MediaAsset
  imageThree: MediaAsset
  caption?: string
}

export type KeyTakeawayBlock = {
  id: string
  blockType: 'key-takeaway'
  label?: string
  items: Array<{ id?: string; text: string }>
}

export type PullQuoteBlock = {
  id: string
  blockType: 'pull-quote'
  quote: string
}

export type InTheKnowBlock = {
  id: string
  blockType: 'in-the-know'
  label?: string
  text: string
}

/** Legacy API/cache shape; always draws through the In the Know renderer. */
export type LegacyHighlightCalloutBlock = Omit<InTheKnowBlock, 'blockType'> & {
  blockType: 'highlight-callout'
}

export type ReadMoreBlock = {
  id: string
  blockType: 'read-more'
  title: string
  url: string
}

export type FaqItem = {
  id: string
  question: string
  answer: string
}

export type FaqBlock = {
  id: string
  blockType: 'faq'
  label?: string
  title?: string
  items: FaqItem[]
}

export type AirbnbCardImage = ImageAttributionData & {
  url: string
  alt: string
  width: number | null
  height: number | null
}

export type AirbnbCard = {
  id: number
  title: string
  listingUrl: string
  stayType: string | null
  near: string | null
  description: string | null
  price: string | null
  rating: number | null
  reviewCount: number | null
  /** The neighbourhood it is tagged with. Absent from an API older than the boxed card. */
  area?: string | null
  /** Up to seven gallery photos, featured first. Absent from an API older than the boxed card. */
  images?: AirbnbCardImage[]
  /** The featured photo, `images[0]`. */
  image: AirbnbCardImage | null
}

/** `airbnb` is null when the Airbnb is unpublished or gone; the card is then skipped. */
export type AirbnbCardBlock = {
  id: string
  blockType: 'airbnb-card'
  airbnb: AirbnbCard | null
  /** Set by `pairStayBoxes`: the section written about this stay, drawn inside its box. */
  lead?: StayLead | null
  /** Set by `pairStayBoxes`: the box's number among the article's Airbnbs. */
  position?: StayPosition | null
}

export type HotelCard = {
  id: number
  title: string
  /** Booking page, else the hotel's own site, else its map link. Null when it has none. */
  url: string | null
  type: string | null
  district: string | null
  /** Dollar ticks, for example "$$$". */
  price: string | null
  image: (ImageAttributionData & { url: string; alt: string; width: number | null; height: number | null }) | null
}

/** `hotel` is null when the accommodation is unpublished or gone; the card is then skipped. */
export type HotelCardBlock = {
  id: string
  blockType: 'hotel-card'
  hotel: HotelCard | null
}

/** One row of a Stay List: a hotel or an Airbnb. */
export type StayListItem = HotelCard & {
  kind: 'hotel' | 'airbnb'
  /** An Airbnb's stars; null for hotels. */
  rating: number | null
}

/**
 * Hotels, or Airbnbs, kept in one block (slug `hotel-list`), drawn as compact
 * rows. Unpublished or gone stays are already left out of `stays`.
 */
export type HotelListBlock = {
  id: string
  blockType: 'hotel-list'
  /** The heading over the list; null shows "Hotels" or "Airbnbs". */
  label: string | null
  stays: StayListItem[]
}

export type ContentBlock =
  | TextBlock
  | ImageBlock
  | ImgPairBlock
  | ImgTrioBlock
  | KeyTakeawayBlock
  | PullQuoteBlock
  | InTheKnowBlock
  | LegacyHighlightCalloutBlock
  | ReadMoreBlock
  | FaqBlock
  | AirbnbCardBlock
  | HotelCardBlock
  | HotelListBlock

/**
 * The byline, as served from the Authors collection (ADR-0007). Authorship is
 * no longer a view of the staff account, so there are no name parts and no
 * nested public profile. Compact article bylines still opt into avatar/links
 * via `articleByline`; the standard-article footer uses the public profile.
 */
export type ArticleAuthor = {
  id: number
  slug?: string | null
  displayName: string
  bio?: string | null
  expertise?: string[]
  avatar?: { url: string; alt?: string | null } | null
  socialLinks?: import('@/features/authors/lib/fetchAuthor').AuthorSocialLinks | null
  articleByline?: {
    avatar?: { url: string; alt?: string | null } | null
    links: Array<{
      platform: import('@/features/authors/lib/fetchAuthor').AuthorSocialPlatform
      url: string
    }>
  }
}

export type SeoSection = {
  metaDescription?: string
  seoTitle?: string
  openGraph?: {
    title?: string
    description?: string
    imageUrl?: string
    url?: string
  }
  twitterCard?: {
    card?: 'summary' | 'summary_large_image'
    title?: string
    description?: string
    imageUrl?: string
  }
  structuredData?: unknown
  robots?: {
    index?: 'index' | 'noindex'
    follow?: 'follow' | 'nofollow'
  }
}

export type Article = {
  id: number
  title: string
  slug: string
  status: string
  publishedAt: string
  updatedAt: string
  author: ArticleAuthor
  tags: Array<{ id: number; name: string; slug: string }>
  location: string
  headerSection: {
    featuredImage: MediaAsset & { alt_text: string }
  }
  contentBlocks: ContentBlock[]
  seoSection?: SeoSection
  /** Access tier and lock state, always sent by the public routes (ADR-0009). */
  gate?: GateState
  /** How the standard article page is framed; missing on older rows means classic. */
  displayLayout?: ArticleDisplayLayout | null
  /**
   * The article's H2 headings, in order, when its Contents box is on. The
   * server builds it from the whole body, so it names locked parts too.
   */
  tableOfContents?: TableOfContentsEntry[]
}

export type ArticleDisplayLayout = 'classic' | 'dark-hero' | 'centered'

/** One line of the Contents box: an H2's anchor id and its text. */
export type TableOfContentsEntry = {
  id: string
  title: string
}

export {
  isListicleVenue,
  isMapsListicleArticle,
  type ListicleItemRow,
  type MapsListicleArticle,
} from './mapsListicle'

export {
  isListicleItineraryArticle,
  type ItineraryDay,
  type ItineraryStopBlock,
  type ItineraryTourAgencyBlock,
  type ItineraryVenueBlock,
  type ListicleItineraryArticle,
} from './itineraryListicle'

export type MapsItem = {
  id: string
  blockType: 'data-dining' | 'data-accommodations' | 'data-attractions' | 'data-nightlife'
  blurb: string
  [key: string]: unknown
}

export type MapsArticle = Omit<Article, 'contentBlocks' | 'headerSection'> & {
  items: MapsItem[]
  header: {
    intro: string
    featuredImage?: MediaAsset
  }
}
