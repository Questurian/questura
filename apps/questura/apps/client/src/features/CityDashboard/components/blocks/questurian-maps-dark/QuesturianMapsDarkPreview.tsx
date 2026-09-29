import Link from '@/components/navigation/PublicLink'
import type { JSX } from 'react'

import type {
  CityHomepageArticleBlock,
  FeaturedArticleTeaser,
  HomepageBlockLayoutProps,
} from '../../../types'
import { BlockSection } from '../BlockSection'
import { NavigableImageTarget } from '../NavigableImageTarget'
import { PublicImage } from '@/components/media/PublicImage'
import { isPriorityImage } from '../heroImagePriority'

/** 90px at phone width, 105px from 1024 up. */
const THUMBNAIL_SIZES = '(min-width: 1024px) 105px, 90px'

/** The navbar section-link face (EAT, STAY, …); every line of this block uses it. */
const NAV_FONT = 'font-[family-name:var(--font-dm-sans)]'

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

function MapRow({
  item,
  isPriority,
}: {
  item: FeaturedArticleTeaser
  isPriority: boolean
}): JSX.Element {
  const imgSrc = item.imageUrlSquare ?? item.imageUrl
  const authorName = item.author?.name?.trim() || null

  return (
    <article className="flex min-w-0 items-center gap-4 1024:gap-5">
      <div className="relative size-[90px] shrink-0 overflow-hidden rounded-[2px] bg-paper 1024:size-[105px]">
        {imgSrc ? (
          <PublicImage
            src={imgSrc}
            alt={item.imageSquare?.alt ?? item.image?.alt ?? ''}
            className="h-full w-full object-cover"
            fetchPriority={isPriority ? 'high' : 'auto'}
            loading={isPriority ? 'eager' : 'lazy'}
            sizes={THUMBNAIL_SIZES}
          />
        ) : null}
        <NavigableImageTarget href={item.articlePath} label={`Open ${item.title}`} />
      </div>
      <div className="min-w-0">
        <h3 className={`${NAV_FONT} text-[1.02rem] leading-[1.3] text-foreground 1024:text-[1.12rem]`}>
          {item.articlePath ? (
            <Link
              href={item.articlePath}
              className="outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent"
            >
              {item.title}
            </Link>
          ) : (
            item.title
          )}
        </h3>
        {authorName ? (
          <p className={`${NAV_FONT} mt-1 text-[0.78rem] text-foreground/55`}>By {authorName}</p>
        ) : null}
      </div>
    </article>
  )
}

/**
 * Questurian Maps as a compact list on white: a pin-and-title header in the
 * site blue, then six small thumbnail rows, three across on desktop,
 * separated by hairline rules.
 */
export function QuesturianMapsDarkPreview({
  block,
  blockIndex,
}: HomepageBlockLayoutProps<CityHomepageArticleBlock>): JSX.Element | null {
  const items = block.items ?? []
  if (items.length === 0) return null

  const title = block.sectionHeading?.trim() || 'Questurian Maps'
  const rows: FeaturedArticleTeaser[][] = []
  for (let index = 0; index < items.length; index += 3) {
    rows.push(items.slice(index, index + 3))
  }

  return (
    <BlockSection className="bg-white py-10 768:py-12" aria-label={title}>
      <h2
        className={`${NAV_FONT} flex items-center justify-center gap-2.5 whitespace-nowrap text-[1.45rem] font-bold uppercase leading-none tracking-[0.08em] text-accent 480:text-[1.9rem] 768:text-[2.3rem]`}
      >
        <PinIcon className="size-6 shrink-0 480:size-8 768:size-9" />
        {title}
      </h2>

      <div className="mt-8 768:mt-10">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={`grid 768:grid-cols-3 ${
              rowIndex > 0 ? 'mt-6 border-t border-foreground/12 pt-6 768:mt-7 768:pt-7' : ''
            }`}
          >
            {row.map((item, columnIndex) => {
              const index = rowIndex * 3 + columnIndex
              return (
                <div
                  key={`${item.articlePath ?? item.title}-${index}`}
                  className={`min-w-0 ${
                    columnIndex > 0
                      ? 'mt-6 border-t border-foreground/12 pt-6 768:mt-0 768:border-l 768:border-t-0 768:pl-6 768:pt-0 1024:pl-8'
                      : ''
                  } ${columnIndex < 2 ? '768:pr-6 1024:pr-8' : ''}`}
                >
                  <MapRow item={item} isPriority={isPriorityImage(blockIndex, index)} />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </BlockSection>
  )
}
