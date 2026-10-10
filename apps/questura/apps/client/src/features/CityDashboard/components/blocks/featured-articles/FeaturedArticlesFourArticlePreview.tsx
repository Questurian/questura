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

function getBlockSectionHeading(items: FeaturedArticleTeaser[]): string | null {
  const type = items[0]?.articleType
  if (!type) return null
  if (type.endsWith('y')) return type.slice(0, -1) + 'ies'
  if (type.endsWith('s')) return type
  return type + 's'
}

type HeroArticleCardProps = {
  article: FeaturedArticleTeaser
  imagePriority: ImagePriority
}

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

  const articlePath = article.articlePath ?? null

  return (
    <section className="city-article-card city-four-hero-card">
      <div className="city-article-image-shell city-four-hero-image relative aspect-square overflow-hidden bg-[#d7dcde]">
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
        <NavigableImageTarget href={articlePath} label={`Read ${article.title}`} />
      </div>

      <div className="city-article-content flex w-full flex-col justify-start px-[var(--block-gutter)] py-3">
        <p className={BLOCK_TYPE.kicker}>
          {articleTypeLabel}
        </p>

        <h2 className={`mt-2.5 ${BLOCK_TYPE.titleL}`} data-title-length={blockTitleLength(article.title)}>
          {articlePath ? (
            <Link href={articlePath} className="hover:underline">
              {article.title}
            </Link>
          ) : (
            article.title
          )}
        </h2>

        <p
          data-article-dek
          className={`mt-3 overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] ${BLOCK_TYPE.dekLead}`}
        >
          {articlePath ? <Link href={articlePath}>{excerpt}</Link> : excerpt}
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

type SideListArticleCardProps = {
  article: FeaturedArticleTeaser
}

function SideListArticleCard({ article }: SideListArticleCardProps): JSX.Element {
  const imageUrl = article.imageUrlSquare ?? article.imageUrl ?? null

  const articleTypeLabel = getArticleTypeLabel(article)
  const excerpt = article.excerpt ?? 'Meta description not set'
  const authorLabel = getAuthorLabel(article)
  const articlePath = article.articlePath ?? null

  return (
    <section className="city-four-side-card">
      <div className="city-four-side-image city-article-image-shell">
        {imageUrl ? (
          <PublicImage
            src={imageUrl}
            alt=""
            className="relative z-10 h-full w-full object-cover"
            decoding="async"
            fetchPriority="auto"
            loading="lazy"
            sizes={BLOCK_IMAGE_SIZES.halfColumn}
          />
        ) : null}
        <NavigableImageTarget href={articlePath} label={`Read ${article.title}`} />
      </div>

      <div className="city-four-side-copy">
        <p className={`city-four-side-type ${BLOCK_TYPE.kicker}`}>{articleTypeLabel}</p>
        <h3 className={`city-four-side-title ${BLOCK_TYPE.titleM}`}>
          {articlePath ? (
            <Link href={articlePath} className="hover:underline">
              {article.title}
            </Link>
          ) : (
            article.title
          )}
        </h3>
        <p data-article-dek className={`city-four-side-meta ${BLOCK_TYPE.dek}`}>
          {articlePath ? <Link href={articlePath}>{excerpt}</Link> : excerpt}
        </p>
        <p className={`city-four-side-author ${BLOCK_TYPE.byline}`}>
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

export function FeaturedArticlesFourArticlePreview({
  block,
  blockIndex,
}: HomepageBlockLayoutProps<FeaturedArticlesBlock>): JSX.Element | null {
  const imagePriority = heroImagePriority(blockIndex)

  if (block.items.length === 0) return null

  const heroArticle = block.items[0]
  const sideArticles = block.items.slice(1, 4)
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

      <div className="city-featured-four-layout">
        <div className="city-featured-four-hero">
          {heroArticle ? (
            <HeroArticleCard
              key={getArticleKey(heroArticle, 0)}
              article={heroArticle}
              imagePriority={imagePriority}
            />
          ) : null}
        </div>

        <div className="city-featured-four-list">
          {sideArticles.map((article, index) => (
            <SideListArticleCard key={getArticleKey(article, index + 1)} article={article} />
          ))}
        </div>
      </div>
    </section>
  )
}
