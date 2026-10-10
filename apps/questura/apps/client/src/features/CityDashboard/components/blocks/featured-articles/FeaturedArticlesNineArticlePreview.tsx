import Link from '@/components/navigation/PublicLink'
import type { JSX } from 'react'

import type {
  FeaturedArticleTeaser,
  FeaturedArticlesBlock,
  HomepageBlockLayoutProps,
} from '../../../types'
import { BLOCK_GUTTER_CLASS, BLOCK_MAX_WIDTH_CLASS } from '../BlockSection'
import { BlockSectionHeader } from '../BlockSectionHeader'
import { BLOCK_TYPE, blockTitleLength } from '../blockType'
import { AuthorLink } from '@/features/authors/components/AuthorLink'
import { NavigableImageTarget } from '../NavigableImageTarget'
import { PublicImage, PublicSource } from '@/components/media/PublicImage'
import { BLOCK_IMAGE_SIZES } from '../blockImageSizes'
import { heroImagePriority, type ImagePriority } from '../heroImagePriority'

function getArticleTypeLabel(article: FeaturedArticleTeaser): string {
  return article.articleType ?? article.category?.name ?? 'Article'
}

function getAuthorLabel(article: FeaturedArticleTeaser): string {
  return article.author?.name || 'Questurian'
}

function getArticleKey(article: FeaturedArticleTeaser, index: number): string {
  return [article.title, article.imageUrlSquare ?? article.imageUrl ?? index].join(':')
}

type SlotCardProps = {
  article: FeaturedArticleTeaser
}

/** Slots 1-2: left-column cards — wide 16/9 image, label, title, byline. */
function WideCard({ article }: SlotCardProps): JSX.Element {
  const mobileImageUrl = article.imageUrlSquare ?? article.imageUrl ?? null
  const desktopImageUrl = article.imageUrl ?? article.imageUrlSquare ?? null
  // `<picture>` resolves to the <img> when no <source> matches, so the mobile
  // crop is the one that has to exist. Aliasing the check lets TypeScript carry
  // the narrowing into the JSX below.
  const fallbackImageUrl = mobileImageUrl ?? desktopImageUrl
  const hasImage = fallbackImageUrl !== null

  const articleTypeLabel = getArticleTypeLabel(article)
  const authorLabel = getAuthorLabel(article)

  return (
    <section className="city-article-card city-article-card--nine-wide grid gap-3 px-[var(--block-gutter)] py-4">
      <div className="city-article-image-shell relative aspect-square overflow-hidden bg-[#d7dcde] 768:aspect-[16/9]">
        {hasImage ? (
          <picture className="block h-full w-full">
            {desktopImageUrl ? (
              <PublicSource media="(min-width: 768px)" src={desktopImageUrl} sizes={BLOCK_IMAGE_SIZES.halfColumn} />
            ) : null}
            <PublicImage
              src={fallbackImageUrl}
              alt=""
              className="relative z-10 h-full w-full object-cover"
              decoding="async"
              fetchPriority="auto"
              loading="lazy"
              sizes={BLOCK_IMAGE_SIZES.halfColumn}
            />
          </picture>
        ) : null}
        <NavigableImageTarget href={article.articlePath} label={`Read ${article.title}`} />
      </div>

      <div className="city-article-content flex w-full flex-col justify-start py-0">
        <p className={BLOCK_TYPE.kicker}>
          {articleTypeLabel}
        </p>

        <h2 className={`mt-2.5 ${BLOCK_TYPE.titleM}`}>
          {article.articlePath ? (
            <Link href={article.articlePath} className="hover:underline">
              {article.title}
            </Link>
          ) : (
            article.title
          )}
        </h2>

        <p className={`mt-3 ${BLOCK_TYPE.byline}`}>
          <AuthorLink
            authorSlug={article.author?.slug}
            authorId={article.author?.id}
            className="hover:underline"
          >
            {authorLabel}
          </AuthorLink>
        </p>
      </div>
    </section>
  )
}

/** Slot 3: center hero — 3/2 image, large title, excerpt, byline. */
type CenterHeroCardProps = SlotCardProps & {
  imagePriority: ImagePriority
}

function CenterHeroCard({ article, imagePriority }: CenterHeroCardProps): JSX.Element {
  const mobileImageUrl = article.imageUrlSquare ?? article.imageUrl ?? null
  const desktopImageUrl = article.imageUrl ?? article.imageUrlSquare ?? null
  // `<picture>` resolves to the <img> when no <source> matches, so the mobile
  // crop is the one that has to exist. Aliasing the check lets TypeScript carry
  // the narrowing into the JSX below.
  const fallbackImageUrl = mobileImageUrl ?? desktopImageUrl
  const hasImage = fallbackImageUrl !== null

  const articleTypeLabel = getArticleTypeLabel(article)
  const excerpt = article.excerpt ?? 'Meta description not set'
  const authorLabel = getAuthorLabel(article)

  return (
    <section className="city-article-card city-article-card--nine-hero grid gap-3 px-[var(--block-gutter)] py-4">
      <div className="city-article-image-shell relative aspect-square overflow-hidden bg-[#d7dcde] 768:aspect-[3/2]">
        {hasImage ? (
          <picture className="block h-full w-full">
            {desktopImageUrl ? (
              <PublicSource media="(min-width: 768px)" src={desktopImageUrl} sizes={BLOCK_IMAGE_SIZES.centreFeature} />
            ) : null}
            <PublicImage
              src={fallbackImageUrl}
              alt=""
              className="relative z-10 h-full w-full object-cover"
              decoding="async"
              {...imagePriority}
              sizes={BLOCK_IMAGE_SIZES.centreFeature}
            />
          </picture>
        ) : null}
        <NavigableImageTarget href={article.articlePath} label={`Read ${article.title}`} />
      </div>

      <div className="city-article-content flex w-full flex-col justify-start py-0">
        <p className={BLOCK_TYPE.kicker}>
          {articleTypeLabel}
        </p>

        <h2 className={`mt-2.5 ${BLOCK_TYPE.titleL}`} data-title-length={blockTitleLength(article.title)}>
          {article.articlePath ? (
            <Link href={article.articlePath} className="hover:underline">
              {article.title}
            </Link>
          ) : (
            article.title
          )}
        </h2>

        <p
          data-article-dek
          className={`mt-3 overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${BLOCK_TYPE.dekLead}`}
        >
          {article.articlePath ? <Link href={article.articlePath}>{excerpt}</Link> : excerpt}
        </p>

        <p className={`mt-3.5 ${BLOCK_TYPE.byline}`}>
          <AuthorLink
            authorSlug={article.author?.slug}
            authorId={article.author?.id}
            className="hover:underline"
          >
            {authorLabel}
          </AuthorLink>
        </p>
      </div>
    </section>
  )
}

/** Slot 4: center horizontal card — copy left, 4/3 image right. */
function HorizontalCard({ article }: SlotCardProps): JSX.Element {
  const imageUrl = article.imageUrl ?? article.imageUrlSquare ?? null

  const articleTypeLabel = getArticleTypeLabel(article)
  const authorLabel = getAuthorLabel(article)

  return (
    <section className="city-article-card city-nine-horiz-card px-[var(--block-gutter)] py-4">
      <div className="city-article-content flex w-full flex-col justify-start py-0">
        <p className={BLOCK_TYPE.kicker}>
          {articleTypeLabel}
        </p>

        <h2 className={`mt-2 ${BLOCK_TYPE.titleM}`}>
          {article.articlePath ? (
            <Link href={article.articlePath} className="hover:underline">
              {article.title}
            </Link>
          ) : (
            article.title
          )}
        </h2>

        <p className={`mt-2.5 ${BLOCK_TYPE.byline}`}>
          <AuthorLink
            authorSlug={article.author?.slug}
            authorId={article.author?.id}
            className="hover:underline"
          >
            {authorLabel}
          </AuthorLink>
        </p>
      </div>

      <div className="city-article-image-shell relative aspect-[4/3] overflow-hidden bg-[#d7dcde]">
        {imageUrl ? (
          <PublicImage
            src={imageUrl}
            alt=""
            className="relative z-10 h-full w-full object-cover"
            decoding="async"
            fetchPriority="auto"
            loading="lazy"
            sizes={BLOCK_IMAGE_SIZES.quarterColumn}
          />
        ) : null}
        <NavigableImageTarget href={article.articlePath} label={`Read ${article.title}`} />
      </div>
    </section>
  )
}

/** Slots 5-9: right-column compact list rows — copy left, small square thumb right. */
function CompactListCard({ article }: SlotCardProps): JSX.Element {
  const imageUrl = article.imageUrlSquare ?? article.imageUrl ?? null
  const excerpt = article.excerpt ?? 'Meta description not set'
  const authorLabel = getAuthorLabel(article)

  return (
    <section className="city-compact-article-card px-[var(--block-gutter)] py-4">
      <div className="city-compact-article-copy">
        <h2 className={`city-compact-article-title ${BLOCK_TYPE.titleS}`}>
          {article.articlePath ? (
            <Link href={article.articlePath} className="hover:underline">
              {article.title}
            </Link>
          ) : (
            article.title
          )}
        </h2>
        <p data-article-dek className={`city-compact-article-meta ${BLOCK_TYPE.dek}`}>
          {article.articlePath ? <Link href={article.articlePath}>{excerpt}</Link> : excerpt}
        </p>
        <p className={`city-compact-article-author ${BLOCK_TYPE.byline}`}>
          By{' '}
          <AuthorLink
            authorSlug={article.author?.slug}
            authorId={article.author?.id}
            className="hover:underline"
          >
            {authorLabel}
          </AuthorLink>
        </p>
      </div>

      <div className="city-article-image-shell city-compact-article-image">
        {imageUrl ? (
          <PublicImage
            src={imageUrl}
            alt=""
            className="relative z-10 h-full w-full object-cover"
            decoding="async"
            fetchPriority="auto"
            loading="lazy"
            sizes={BLOCK_IMAGE_SIZES.sideThumbnail}
          />
        ) : null}
        <NavigableImageTarget href={article.articlePath} label={`Read ${article.title}`} />
      </div>
    </section>
  )
}

export function FeaturedArticlesNineArticlePreview({
  block,
  blockIndex,
}: HomepageBlockLayoutProps<FeaturedArticlesBlock>): JSX.Element | null {
  const imagePriority = heroImagePriority(blockIndex)

  if (block.items.length === 0) return null

  const wideArticles = block.items.slice(0, 2)
  const heroArticle = block.items[2]
  const horizArticle = block.items[3]
  const listArticles = block.items.slice(4, 9)
  const sectionHeading = block.sectionHeading?.trim() || null
  const sectionSubheading = block.sectionSubheading?.trim() || null

  return (
    <section aria-label="Featured articles">
      {sectionHeading ? (
        <BlockSectionHeader
          heading={sectionHeading}
          subheading={sectionSubheading}
          className={`${BLOCK_MAX_WIDTH_CLASS} ${BLOCK_GUTTER_CLASS} pt-8 pb-0`}
        />
      ) : null}

      <div className="city-featured-nine-layout">
        <div className="city-featured-nine-left">
          {wideArticles.map((article, index) => (
            <WideCard key={getArticleKey(article, index)} article={article} />
          ))}
        </div>

        <div className="city-featured-nine-center">
          {heroArticle ? (
            <CenterHeroCard
              key={getArticleKey(heroArticle, 2)}
              article={heroArticle}
              imagePriority={imagePriority}
            />
          ) : null}
          {horizArticle ? (
            <HorizontalCard key={getArticleKey(horizArticle, 3)} article={horizArticle} />
          ) : null}
        </div>

        <div className="city-featured-nine-right">
          {listArticles.map((article, index) => (
            <CompactListCard key={getArticleKey(article, index + 4)} article={article} />
          ))}
        </div>
      </div>
    </section>
  )
}
