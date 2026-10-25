import { ReadMoreBlockRenderer } from './ReadMoreBlock'
import { PublicImage } from '@/components/media/PublicImage'
import {
  EditorialLabelRule,
  editorialReadingLabelClass,
} from './EditorialRule'
import { InlineMarkdown } from './InlineMarkdown'
import { AirbnbCardBlockRenderer } from './AirbnbCardBlock'
import { HotelCardBlockRenderer } from './HotelCardBlock'
import { PhotoCreditLine } from './PhotoCreditLine'
import { blockPhotoCredit, photoCredit } from '../lib/photoCredit'
import {
  ContentBlock,
  FaqBlock,
  HighlightCalloutBlock,
  ImageBlock,
  ImgPairBlock,
  ImgTrioBlock,
  InTheKnowBlock,
  KeyTakeawayBlock,
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

/** Editorial interruptions share the prose grid, readable labels and quiet rules.
 * Warm paper distinguishes practical advice; quotes get space rather than ornaments.
 */

function KeyTakeawayBlockRenderer({ block }: { block: KeyTakeawayBlock }) {
  return (
    <aside className="py-4 sm:py-5">
      <EditorialLabelRule reading className="mb-5">
        {block.label ?? 'Key takeaways'}
      </EditorialLabelRule>
      <ul className="list-disc space-y-3 pl-5 marker:text-accent">
        {block.items.map((item, index) => (
          <li key={item.id ?? `${index}-${item.text}`} className="pl-1 text-foreground">
            <span className="font-display text-[17px] leading-[1.7] sm:text-[18px] sm:leading-[1.78]">
              <InlineMarkdown text={item.text} />
            </span>
          </li>
        ))}
      </ul>
      <div aria-hidden className="mt-6 h-px bg-foreground/15" />
    </aside>
  )
}

function PullQuoteBlockRenderer({ block }: { block: PullQuoteBlock }) {
  return (
    <blockquote className="border-y border-foreground/20 py-7 text-foreground sm:py-9">
      <p className="max-w-[32ch] font-display text-[24px] leading-[1.4] sm:text-[30px] sm:leading-[1.4]">
        &ldquo;<InlineMarkdown text={block.quote} />&rdquo;
      </p>
    </blockquote>
  )
}

function InTheKnowBlockRenderer({ block }: { block: InTheKnowBlock }) {
  return (
    <aside className="bg-paper px-5 py-6 sm:px-7 sm:py-7">
      <EditorialLabelRule reading className="mb-4">
        {block.label ?? 'In the know'}
      </EditorialLabelRule>
      <p className="font-display text-[17px] leading-[1.7] text-foreground sm:text-[18px] sm:leading-[1.78]">
        <InlineMarkdown text={block.text} />
      </p>
    </aside>
  )
}

function HighlightCalloutBlockRenderer({ block }: { block: HighlightCalloutBlock }) {
  return (
    // A marginal note: one accent hairline in the gutter, no fill, no frame.
    <aside className="border-l border-accent py-2 pl-5 sm:pl-6">
      <p className={`mb-2.5 text-accent ${editorialReadingLabelClass}`}>
        {block.label ?? "Editor’s note"}
      </p>
      <p className="font-display text-[17px] font-normal leading-[1.7] text-foreground sm:text-[18px] sm:leading-[1.78]">
        <InlineMarkdown text={block.text} />
      </p>
    </aside>
  )
}

function FaqBlockRenderer({ block }: { block: FaqBlock }) {
  return (
    <section className="py-4 sm:py-5">
      <EditorialLabelRule reading className="mb-1">
        {block.title ?? block.label ?? 'FAQ'}
      </EditorialLabelRule>
      <dl>
        {block.items.map((item, index) => (
          <div
            key={item.id}
            className={index === 0 ? 'py-5' : 'border-t border-foreground/12 py-5'}
          >
            <dt className="font-display text-[18px] font-semibold leading-[1.4] text-foreground sm:text-[20px]">
              <InlineMarkdown text={item.question} />
            </dt>
            <dd className="mt-1.5 font-display text-[17px] leading-[1.7] text-foreground/85 sm:text-[18px] sm:leading-[1.78]">
              <InlineMarkdown text={item.answer} />
            </dd>
          </div>
        ))}
      </dl>
      <div aria-hidden className="h-px bg-foreground/15" />
    </section>
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
      return <InTheKnowBlockRenderer block={block} />
    case 'highlight-callout':
      return <HighlightCalloutBlockRenderer block={block} />
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
