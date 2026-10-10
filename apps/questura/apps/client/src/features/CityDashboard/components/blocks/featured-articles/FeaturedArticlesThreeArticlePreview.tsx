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
import { LAZY_IMAGE, heroImagePriority, type ImagePriority } from '../heroImagePriority'
import { PhoneSquareImage } from '../PhoneSquareImage'

function joinClassNames(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

function getArticleTypeLabel(article: FeaturedArticleTeaser): string {
  return article.articleType ?? article.category?.name ?? 'Article'
}

function getAuthorLabel(article: FeaturedArticleTeaser): string {
  return article.author?.name || 'Questurian'
}

function getArticleKey(article: FeaturedArticleTeaser, index: number): string {
  return [article.title, article.imageUrlSquare ?? article.imageUrl ?? index].join(':')
}

function getBlockSectionHeading(items: FeaturedArticleTeaser[]): string | null {
  const type = items[0]?.articleType
  if (!type) return null
  if (type.endsWith('y')) return type.slice(0, -1) + 'ies'
  if (type.endsWith('s')) return type
  return type + 's'
}

function ArticleTitleLink({ article }: { article: FeaturedArticleTeaser }): JSX.Element {
  return article.articlePath ? (
    <Link href={article.articlePath} className="hover:underline">
      {article.title}
    </Link>
  ) : (
    <>{article.title}</>
  )
}

type HeroArticleCardProps = {
  article: FeaturedArticleTeaser
  imagePriority: ImagePriority
}

// Slot 1 in the hero-left layout: large image over copy, mirrors the four-slot hero.
function HeroArticleCard({ article, imagePriority }: HeroArticleCardProps): JSX.Element {
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
    <section className="city-article-card city-three-hero-card">
      <div className="city-article-image-shell city-three-hero-image relative aspect-square overflow-hidden bg-[#d7dcde]">
        {hasImage ? (
          <picture className="block h-full w-full">
            {desktopImageUrl ? (
              <PublicSource media="(min-width: 1024px)" src={desktopImageUrl} sizes={BLOCK_IMAGE_SIZES.hero} />
            ) : null}
            <PublicImage
              src={fallbackImageUrl}
              alt=""
              className="relative z-10 h-full w-full object-cover"
              decoding="async"
              {...imagePriority}
              sizes={BLOCK_IMAGE_SIZES.hero}
            />
          </picture>
        ) : null}
        <NavigableImageTarget href={article.articlePath} label={`Read ${article.title}`} />
      </div>

      <div className="city-article-content flex w-full flex-col justify-start px-[var(--block-gutter)] py-3">
        <p className={BLOCK_TYPE.kicker}>
          {articleTypeLabel}
        </p>

        <h2 className={`mt-2.5 ${BLOCK_TYPE.titleL}`} data-title-length={blockTitleLength(article.title)}>
          <ArticleTitleLink article={article} />
        </h2>

        <p
          data-article-dek
          className={`mt-3 overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] ${BLOCK_TYPE.dekLead}`}
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

type StackedWideCardProps = {
  article: FeaturedArticleTeaser
  variant?: 'stack' | 'fc-side'
}

// Wide-image card: right-column stack in hero-left, side columns in featured-center.
function StackedWideCard({ article, variant = 'stack' }: StackedWideCardProps): JSX.Element {
  const imageUrl = article.imageUrl ?? article.imageUrlSquare ?? null

  const articleTypeLabel = getArticleTypeLabel(article)
  const authorLabel = getAuthorLabel(article)

  return (
    <section
      className={joinClassNames(
        'city-three-stack-card',
        variant === 'fc-side' && 'city-three-fc-side-card',
      )}
    >
      <div className="city-article-image-shell city-three-stack-image">
        {imageUrl ? (
          <PhoneSquareImage article={article} priority={LAZY_IMAGE} sizes={BLOCK_IMAGE_SIZES.halfColumn} />
        ) : null}
        <NavigableImageTarget href={article.articlePath} label={`Read ${article.title}`} />
      </div>

      <div className="city-three-stack-copy">
        <p className={`city-three-stack-type ${BLOCK_TYPE.kicker}`}>{articleTypeLabel}</p>
        <h3 className={`city-three-stack-title ${BLOCK_TYPE.titleM}`}>
          <ArticleTitleLink article={article} />
        </h3>
        <p className={`city-three-stack-author ${BLOCK_TYPE.byline}`}>
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

type CenterFeatureCardProps = {
  article: FeaturedArticleTeaser
  imagePriority: ImagePriority
}

// Slot 2 in the featured-center layout: tall center feature.
function CenterFeatureCard({ article, imagePriority }: CenterFeatureCardProps): JSX.Element {
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
    <section className="city-three-stack-card city-three-fc-center-card">
      <div className="city-article-image-shell city-three-stack-image city-three-fc-center-image">
        {hasImage ? (
          <picture className="block h-full w-full">
            {desktopImageUrl ? (
              <PublicSource media="(min-width: 1024px)" src={desktopImageUrl} sizes={BLOCK_IMAGE_SIZES.centreFeature} />
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

      <div className="city-three-stack-copy">
        <p className={`city-three-stack-type ${BLOCK_TYPE.kicker}`}>{articleTypeLabel}</p>
        <h3
          className={`city-three-stack-title city-three-fc-center-title ${BLOCK_TYPE.titleL}`}
          data-title-length={blockTitleLength(article.title)}
        >
          <ArticleTitleLink article={article} />
        </h3>
        <p data-article-dek className={`city-three-fc-center-meta ${BLOCK_TYPE.dekLead}`}>
          {article.articlePath ? <Link href={article.articlePath}>{excerpt}</Link> : excerpt}
        </p>
        <p className={`city-three-stack-author ${BLOCK_TYPE.byline}`}>
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

export function FeaturedArticlesThreeArticlePreview({
  block,
  blockIndex,
}: HomepageBlockLayoutProps<FeaturedArticlesBlock>): JSX.Element | null {
  if (block.items.length === 0) return null

  const imagePriority = heroImagePriority(blockIndex)

  const layout = block.slot3Layout === 'featured-center' ? 'featured-center' : 'hero-left'
  const articles = block.items.slice(0, 3)
  const sectionHeading = block.sectionHeading?.trim() || getBlockSectionHeading(block.items)
  const sectionSubheading = block.sectionSubheading?.trim() || null

  return (
    <section className="bg-[#f5f0e8]" aria-label="Featured articles">
      {sectionHeading ? (
        <BlockSectionHeader
          heading={sectionHeading}
          subheading={sectionSubheading}
          className={`${BLOCK_MAX_WIDTH_CLASS} ${BLOCK_GUTTER_CLASS} pt-8 pb-4`}
        />
      ) : null}

      {layout === 'featured-center' ? (
        <div className="city-featured-three-fc-layout">
          {articles.map((article, index) =>
            index === 1 ? (
              <CenterFeatureCard
                key={getArticleKey(article, index)}
                article={article}
                imagePriority={imagePriority}
              />
            ) : (
              <StackedWideCard
                key={getArticleKey(article, index)}
                article={article}
                variant="fc-side"
              />
            ),
          )}
        </div>
      ) : (
        <div className="city-featured-three-layout">
          <div className="city-featured-three-hero">
            <HeroArticleCard
              key={getArticleKey(articles[0], 0)}
              article={articles[0]}
              imagePriority={imagePriority}
            />
          </div>

          <div className="city-featured-three-stack">
            {articles.slice(1, 3).map((article, index) => (
              <StackedWideCard key={getArticleKey(article, index + 1)} article={article} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
