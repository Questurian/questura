import Link from '@/components/navigation/PublicLink'
import type { JSX } from 'react'

import { AuthorLink } from '@/features/authors/components/AuthorLink'
import { cityLabelFromArticlePath } from '../../../lib/articlePathCity'
import type {
  CityHomepageArticleBlock,
  FeaturedArticleTeaser,
  HomepageBlockLayoutProps,
} from '../../../types'
import { BlockSection } from '../BlockSection'
import { BLOCK_IMAGE_SIZES } from '../blockImageSizes'
import { BLOCK_TYPE } from '../blockType'
import { EAGER_IMAGE, LAZY_IMAGE, isPriorityImage } from '../heroImagePriority'
import { NavigableImageTarget } from '../NavigableImageTarget'
import { PhoneSquareImage } from '../PhoneSquareImage'

const DEFAULT_TITLE = 'Questurian Maps'

function PinIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M12 2.25c-4.14 0-7.5 3.3-7.5 7.38 0 5.3 6.28 11.3 6.55 11.55a1.37 1.37 0 0 0 1.9 0c.27-.25 6.55-6.25 6.55-11.55 0-4.08-3.36-7.38-7.5-7.38Zm0 10.13a2.75 2.75 0 1 1 0-5.5 2.75 2.75 0 0 1 0 5.5Z"
      />
    </svg>
  )
}

/**
 * One map. From 768 every card is the same: wide photo, city, title, dek,
 * byline. On a phone the first card keeps that shape (square photo, per the
 * phone square rule) and the rest fold into rows with a 104px thumbnail, so
 * six maps don't cost six screens.
 */
function MapCard({
  item,
  isLead,
  isPriority,
}: {
  item: FeaturedArticleTeaser
  isLead: boolean
  isPriority: boolean
}): JSX.Element {
  const href = item.articlePath ?? null
  const kicker = cityLabelFromArticlePath(href) ?? item.articleType ?? DEFAULT_TITLE
  const hasImage = Boolean(item.imageUrl ?? item.imageUrlSquare)

  return (
    <article className={`group ${isLead ? 'flex flex-col' : 'flex items-start gap-4 768:flex-col 768:gap-0'}`}>
      <div
        className={`relative shrink-0 overflow-hidden bg-background-warm ${
          isLead ? 'aspect-square w-full' : 'size-[104px]'
        } 768:aspect-[3/2] 768:h-auto 768:w-full`}
      >
        {hasImage ? (
          <PhoneSquareImage
            article={item}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            priority={isPriority ? EAGER_IMAGE : LAZY_IMAGE}
            sizes={isLead ? BLOCK_IMAGE_SIZES.mapsGridLead : BLOCK_IMAGE_SIZES.mapsGridRow}
          />
        ) : null}
        <NavigableImageTarget href={href} label={`Open ${item.title}`} />
      </div>

      <div className={`min-w-0 ${isLead ? 'pt-4' : 'flex-1 768:pt-4'}`}>
        <p className={BLOCK_TYPE.kicker}>{kicker}</p>
        <h3 className={`mt-2 ${BLOCK_TYPE.titleM}`}>
          {href ? <Link href={href}>{item.title}</Link> : item.title}
        </h3>
        {item.excerpt ? (
          <p
            data-article-dek
            className={`mt-2 overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${
              isLead ? '[display:-webkit-box]' : 'hidden 768:[display:-webkit-box]'
            } ${BLOCK_TYPE.dek}`}
          >
            {href ? <Link href={href}>{item.excerpt}</Link> : item.excerpt}
          </p>
        ) : null}
        {item.author?.name ? (
          <p className={`mt-3 ${BLOCK_TYPE.byline}`}>
            By{' '}
            <AuthorLink
              authorSlug={item.author.slug}
              authorId={item.author.id}
              className="hover:underline"
            >
              {item.author.name}
            </AuthorLink>
          </p>
        ) : null}
      </div>
    </article>
  )
}

/**
 * Questurian Maps as a section of a food-and-travel front: a heading on a
 * rule, then the maps as photo cards, three across on desktop and two on a
 * tablet, on the page ground like the blocks around it.
 */
export function QuesturianMapsDarkPreview({
  block,
  blockIndex,
}: HomepageBlockLayoutProps<CityHomepageArticleBlock>): JSX.Element | null {
  const items = block.items ?? []
  if (items.length === 0) return null

  const heading = block.sectionHeading?.trim() || null
  const title = heading ?? DEFAULT_TITLE
  const subheading = block.sectionSubheading?.trim() || null

  return (
    <BlockSection
      className="py-12 768:py-16"
      aria-label={title}
    >
      <div className="border-b border-foreground/20 pb-4 768:pb-5">
        {/* A custom heading keeps the series name above it; the default
            heading is the series name, so it carries the pin itself. */}
        {heading ? (
          <p className={`mb-2.5 flex items-center gap-1.5 ${BLOCK_TYPE.kicker}`}>
            <PinIcon className="size-3.5 shrink-0" />
            {DEFAULT_TITLE}
          </p>
        ) : null}
        <h2 className={`flex items-center gap-2.5 ${BLOCK_TYPE.sectionHeading}`}>
          {heading ? null : <PinIcon className="size-[0.8em] shrink-0 text-accent" />}
          {title}
        </h2>
        {subheading ? <p className={BLOCK_TYPE.sectionSubheading}>{subheading}</p> : null}
      </div>

      <ul className="mt-6 grid 768:mt-8 768:grid-cols-2 768:gap-x-8 768:gap-y-10 1024:grid-cols-3 1024:gap-x-10 1024:gap-y-12">
        {items.map((item, index) => (
          <li
            key={`${item.articlePath ?? item.title}-${index}`}
            className={
              index === 0
                ? 'pb-5 768:pb-0'
                : 'border-t border-foreground/12 py-5 last:pb-0 768:border-t-0 768:py-0'
            }
          >
            <MapCard
              item={item}
              isLead={index === 0}
              isPriority={isPriorityImage(blockIndex, index)}
            />
          </li>
        ))}
      </ul>
    </BlockSection>
  )
}
