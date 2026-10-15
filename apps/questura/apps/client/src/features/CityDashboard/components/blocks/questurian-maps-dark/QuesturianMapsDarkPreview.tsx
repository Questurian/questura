import Link from '@/components/navigation/PublicLink'
import type { JSX } from 'react'

import { AuthorLink } from '@/features/authors/components/AuthorLink'
import { cityLabelFromArticlePath } from '../../../lib/articlePathCity'
import type {
  CityHomepageArticleBlock,
  FeaturedArticleTeaser,
  HomepageBlockLayoutProps,
  MapsTheme,
  QuesturianMapsDarkBlock,
} from '../../../types'
import { BlockSection } from '../BlockSection'
import { BLOCK_IMAGE_SIZES } from '../blockImageSizes'
import { BLOCK_TYPE } from '../blockType'
import { EAGER_IMAGE, LAZY_IMAGE, isPriorityImage } from '../heroImagePriority'
import { NavigableImageTarget } from '../NavigableImageTarget'
import { PhoneSquareImage } from '../PhoneSquareImage'

/**
 * Questurian Maps as a colour plate: a centred "Maps" title with a pin, then
 * the maps three across. Two themes, one the inverse of the other, picked per
 * block in the homepage tool:
 *
 * - `blue`: the block on a full-bleed blue field, type in the page's cream.
 * - `inverted`: the block on the page ground, the title, pin and labels blue.
 *
 * Cards never move on hover: the photo takes NavigableImageTarget's tint and
 * the title underlines.
 */
const DEFAULT_TITLE = 'Maps'

const LABEL =
  'font-[family-name:var(--font-dm-sans)] text-[0.7rem] font-bold uppercase leading-[1.3] tracking-[0.16em]'

/**
 * The pin sits on the baseline and stands exactly as tall as the title's
 * capitals: its viewBox is cropped to the ink, so the box height is the pin's
 * height. 0.625em is Cormorant Garamond's cap height (measured).
 */
function TitlePin(): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 16"
      fill="currentColor"
      className="mr-[0.24em] inline-block h-[0.625em] w-auto align-baseline"
    >
      <path d="M6 0C2.69 0 0 2.6 0 5.82 0 10.18 6 16 6 16s6-5.82 6-10.18C12 2.6 9.31 0 6 0Zm0 8.2a2.3 2.3 0 1 1 0-4.6 2.3 2.3 0 0 1 0 4.6Z" />
    </svg>
  )
}

function cityOf(item: FeaturedArticleTeaser): string {
  return cityLabelFromArticlePath(item.articlePath ?? null) ?? item.articleType ?? DEFAULT_TITLE
}

const MODE = {
  blue: {
    band: 'bg-accent text-background',
    rule: 'border-background/25',
    kicker: 'text-background/75',
    title: '!text-background',
    dek: '!text-background/80',
    byline: '!text-background/70',
    row: 'border-background/20',
    imageGround: 'bg-background/15',
  },
  inverted: {
    band: 'text-accent',
    rule: 'border-accent/35',
    kicker: 'text-accent',
    title: '',
    dek: '',
    byline: '',
    row: 'border-foreground/12',
    imageGround: 'bg-background-warm',
  },
} as const satisfies Record<MapsTheme, Record<string, string>>

function Card({
  item,
  isLead,
  isPriority,
  mode,
}: {
  item: FeaturedArticleTeaser
  isLead: boolean
  isPriority: boolean
  mode: MapsTheme
}): JSX.Element {
  const href = item.articlePath ?? null
  const hasImage = Boolean(item.imageUrl ?? item.imageUrlSquare)
  const tone = MODE[mode]

  return (
    <article className={isLead ? 'flex flex-col' : 'flex items-start gap-4 768:flex-col 768:gap-0'}>
      <div
        className={`city-article-image-shell relative shrink-0 overflow-hidden ${tone.imageGround} ${
          isLead ? 'aspect-square w-full' : 'size-[104px]'
        } 768:aspect-[3/2] 768:h-auto 768:w-full`}
      >
        {hasImage ? (
          <PhoneSquareImage
            article={item}
            className="relative z-10 h-full w-full object-cover"
            priority={isPriority ? EAGER_IMAGE : LAZY_IMAGE}
            sizes={isLead ? BLOCK_IMAGE_SIZES.mapsGridLead : BLOCK_IMAGE_SIZES.mapsGridRow}
          />
        ) : null}
        <NavigableImageTarget href={href} label={`Open ${item.title}`} />
      </div>

      <div className={`min-w-0 ${isLead ? 'pt-4' : 'flex-1 768:pt-4'}`}>
        <p className={`${LABEL} ${tone.kicker}`}>{cityOf(item)}</p>
        <h3 className={`mt-2 ${BLOCK_TYPE.titleM} ${tone.title}`}>
          {href ? (
            <Link href={href} className="decoration-1 underline-offset-[0.14em] hover:underline">
              {item.title}
            </Link>
          ) : (
            item.title
          )}
        </h3>
        {item.excerpt ? (
          <p
            className={`mt-2 overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${
              isLead ? '[display:-webkit-box]' : 'hidden 768:[display:-webkit-box]'
            } ${BLOCK_TYPE.dek} ${tone.dek}`}
          >
            {item.excerpt}
          </p>
        ) : null}
        {item.author?.name ? (
          <p className={`mt-3 ${BLOCK_TYPE.byline} ${tone.byline}`}>
            By{' '}
            <AuthorLink authorSlug={item.author.slug} authorId={item.author.id} className="hover:underline">
              {item.author.name}
            </AuthorLink>
          </p>
        ) : null}
      </div>
    </article>
  )
}

export function QuesturianMapsDarkPreview({
  block,
  blockIndex,
}: HomepageBlockLayoutProps<CityHomepageArticleBlock>): JSX.Element | null {
  const items = block.items ?? []
  if (items.length === 0) return null

  const theme: MapsTheme = (block as QuesturianMapsDarkBlock).mapsTheme === 'inverted' ? 'inverted' : 'blue'
  const title = block.sectionHeading?.trim() || DEFAULT_TITLE
  const subheading = block.sectionSubheading?.trim() || null
  const tone = MODE[theme]

  return (
    <BlockSection className={`py-14 768:py-20 ${tone.band}`} aria-label={title}>
      <div className={`flex flex-col items-center border-b pb-8 text-center 768:pb-10 ${tone.rule}`}>
        <h2 className="font-[family-name:var(--font-editorial-serif)] text-[2.5rem] font-medium leading-none tracking-[-0.01em] 768:text-[3.4rem]">
          <TitlePin />
          {title}
        </h2>
        {subheading ? (
          <p className="mt-3 font-[family-name:var(--font-editorial-serif)] text-[1.15rem] opacity-85">{subheading}</p>
        ) : null}
      </div>

      <ul className="mt-8 grid 768:mt-12 768:grid-cols-2 768:gap-x-8 768:gap-y-10 1024:grid-cols-3 1024:gap-x-10 1024:gap-y-12">
        {items.map((item, index) => (
          <li
            key={`${item.articlePath ?? item.title}-${index}`}
            className={
              index === 0 ? 'pb-5 768:pb-0' : `border-t ${tone.row} py-5 last:pb-0 768:border-t-0 768:py-0`
            }
          >
            <Card item={item} isLead={index === 0} isPriority={isPriorityImage(blockIndex, index)} mode={theme} />
          </li>
        ))}
      </ul>
    </BlockSection>
  )
}
