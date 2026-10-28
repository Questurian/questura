import { ReadMoreBlockRenderer } from './ReadMoreBlock'
import { PublicImage } from '@/components/media/PublicImage'
import { EditorialDiamond, EditorialTick } from './EditorialRule'
import { EditorialBox, editorialBoxCopyClass } from './EditorialBox'
import { InlineMarkdown } from './InlineMarkdown'
import { AirbnbCardBlockRenderer } from './AirbnbCardBlock'
import { HotelCardBlockRenderer } from './HotelCardBlock'
import { PhotoCreditLine } from './PhotoCreditLine'
import { blockPhotoCredit, photoCredit } from '../lib/photoCredit'
import {
  ContentBlock,
  FaqBlock,
  ImageBlock,
  ImgPairBlock,
  ImgTrioBlock,
  InTheKnowBlock,
  KeyTakeawayBlock,
  LegacyHighlightCalloutBlock,
  PullQuoteBlock,
  TextBlock,
} from '../types'

/**
 * Renderers for a standard article's content blocks.
 *
 * Extracted from ArticlePage so the same switch can render blocks that arrive
 * after hydration -- a member's full body comes from a client fetch, not from
 * the cached server render (ADR-0009).
 */

/**
 * One run of body HTML.
 *
 * A text block is split into several of these when an ad is planned inside it
 * (see `lib/adPlacement`). Each run keeps the `article-prose` class so the
 * descendant type rules still apply, and drops the leading heading's top margin
 * -- the parent `space-y-*` already owns the gap after the ad above it.
 */
export function ProseRun({ html }: { html: string }) {
  return (
    <div
      className="article-prose [&>h2:first-child]:mt-0 [&>h3:first-child]:mt-0"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function TextBlockRenderer({ block }: { block: TextBlock }) {
  return <ProseRun html={block.content} />
}

function ImageBlockRenderer({ block }: { block: ImageBlock }) {
  return (
    <figure className="-mx-4 1024:mx-0">
      <PublicImage
        src={block.image.url}
        alt={block.altText ?? block.image.alt_text ?? ''}
        width={1200}
        height={900}
        sizes="(min-width: 1024px) 880px, (min-width: 768px) 760px, 100vw"
        className="w-full object-cover"
      />
      <PhotoCreditLine
        credit={photoCredit(block.image.mediaSet, block.image)}
        className="px-4 pt-2 1024:px-0"
      />
      {block.caption && (
        <figcaption className="px-4 pt-2 font-display text-[14px] leading-relaxed text-foreground/70 1024:px-0 sm:text-[15px]">
          {block.caption}
        </figcaption>
      )}
    </figure>
  )
}

function ImgPairBlockRenderer({ block }: { block: ImgPairBlock }) {
  const alt1 = block.imageOne.mediaSet?.alt_text ?? block.imageOne.alt_text ?? ''
  const alt2 = block.imageTwo.mediaSet?.alt_text ?? block.imageTwo.alt_text ?? ''

  return (
    <figure className="-mx-4 1024:mx-0">
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <PublicImage
          src={block.imageOne.url}
          alt={alt1}
          width={720}
          height={960}
          sizes="(min-width: 1024px) 436px, (min-width: 768px) 376px, 50vw"
          className="w-full aspect-[3/4] object-cover"
        />
        <PublicImage
          src={block.imageTwo.url}
          alt={alt2}
          width={720}
          height={960}
          sizes="(min-width: 1024px) 436px, (min-width: 768px) 376px, 50vw"
          className="w-full aspect-[3/4] object-cover"
        />
      </div>
      <PhotoCreditLine
        credit={blockPhotoCredit([
          [block.imageOne.mediaSet, block.imageOne],
          [block.imageTwo.mediaSet, block.imageTwo],
        ])}
        className="px-4 pt-2 1024:px-0"
      />
      {block.caption && (
        <figcaption className="px-4 pt-2 font-display text-[14px] leading-relaxed text-foreground/70 1024:px-0 sm:text-[15px]">
          {block.caption}
        </figcaption>
      )}
    </figure>
  )
}

function ImgTrioBlockRenderer({ block }: { block: ImgTrioBlock }) {
  const images = [block.imageOne, block.imageTwo, block.imageThree]
  const isLandscape = block.format === 'landscape'
  const imageClassName = isLandscape ? 'aspect-[16/10]' : 'aspect-square'

  return (
    <figure className="-mx-4 1024:mx-0">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        {images.map((image, index) => (
          <PublicImage
            key={`${image.id}-${index}`}
            src={image.url}
            alt={image.mediaSet?.alt_text ?? image.alt_text ?? ''}
            width={720}
            height={isLandscape ? 450 : 720}
            sizes="(min-width: 1024px) 288px, (min-width: 640px) 33vw, 100vw"
            className={`w-full object-cover ${imageClassName}`}
          />
        ))}
      </div>
      <PhotoCreditLine
        credit={blockPhotoCredit(images.map((image) => [image.mediaSet, image]))}
        className="px-4 pt-2 1024:px-0"
      />
      {block.caption && (
        <figcaption className="px-4 pt-2 font-display text-[14px] leading-relaxed text-foreground/70 1024:px-0 sm:text-[15px]">
          {block.caption}
        </figcaption>
      )}
    </figure>
  )
}

/**
 * Editorial blocks: square paper boxes opened by the sans kicker
 * (`EditorialBox`). The pull quote is the one block left unboxed: the
 * site's diamond ornament over large italic type.
 */

function KeyTakeawayBlockRenderer({ block }: { block: KeyTakeawayBlock }) {
  return (
    <EditorialBox label={block.label ?? 'Key takeaways'}>
      <ul className="space-y-3">
        {block.items.map((item, index) => (
          <li key={item.id ?? `${index}-${item.text}`} className="flex gap-3.5 text-foreground">
            {/* Sits the tick on the first line's centre; the tick keeps its own top margin. */}
            <span aria-hidden className="flex shrink-0 pt-1 sm:pt-[5px]">
              <EditorialTick className="text-accent" />
            </span>
            <span className={editorialBoxCopyClass}>
              <InlineMarkdown text={item.text} />
            </span>
          </li>
        ))}
      </ul>
    </EditorialBox>
  )
}

function PullQuoteBlockRenderer({ block }: { block: PullQuoteBlock }) {
  return (
    <figure className="px-2 py-4 text-center sm:px-8 sm:py-6">
      <EditorialDiamond className="mx-auto mb-5 text-accent sm:mb-6" />
      <blockquote className="mx-auto max-w-[30ch] text-balance font-display text-[24px] italic leading-[1.4] text-foreground sm:text-[30px] sm:leading-[1.36]">
        <p>
          <InlineMarkdown text={block.quote} />
        </p>
      </blockquote>
    </figure>
  )
}

function InTheKnowBlockRenderer({ block }: { block: InTheKnowBlock | LegacyHighlightCalloutBlock }) {
  return (
    <EditorialBox tone="warm" label={block.label ?? 'In the know'}>
      <p className={editorialBoxCopyClass}>
        <InlineMarkdown text={block.text} />
      </p>
    </EditorialBox>
  )
}

function FaqBlockRenderer({ block }: { block: FaqBlock }) {
  return (
    <EditorialBox as="section" label={block.title ?? block.label ?? 'FAQ'}>
      <dl className="space-y-5 sm:space-y-6">
        {block.items.map((item) => (
          <div key={item.id}>
            <dt className="font-display text-[18px] font-semibold leading-[1.4] text-foreground sm:text-[20px]">
              <InlineMarkdown text={item.question} />
            </dt>
            <dd className={`mt-1.5 text-foreground/85 ${editorialBoxCopyClass}`}>
              <InlineMarkdown text={item.answer} />
            </dd>
          </div>
        ))}
      </dl>
    </EditorialBox>
  )
}

export function BlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.blockType) {
    case 'text':
      return <TextBlockRenderer block={block} />
    case 'image':
      return <ImageBlockRenderer block={block} />
    case 'img-pair':
      return <ImgPairBlockRenderer block={block} />
    case 'img-trio':
      return <ImgTrioBlockRenderer block={block} />
    case 'key-takeaway':
      return <KeyTakeawayBlockRenderer block={block} />
    case 'pull-quote':
      return <PullQuoteBlockRenderer block={block} />
    case 'in-the-know':
    case 'highlight-callout':
      return <InTheKnowBlockRenderer block={block} />
    case 'read-more':
      return <ReadMoreBlockRenderer block={block} />
    case 'faq':
      return <FaqBlockRenderer block={block} />
    case 'airbnb-card':
      return <AirbnbCardBlockRenderer block={block} />
    case 'hotel-card':
      return <HotelCardBlockRenderer block={block} />
    default:
      return null
  }
}
