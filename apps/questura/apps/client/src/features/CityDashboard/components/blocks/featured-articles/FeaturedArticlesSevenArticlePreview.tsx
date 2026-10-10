import Link from '@/components/navigation/PublicLink'
import type { JSX } from 'react'

import type {
  FeaturedArticleTeaser,
  FeaturedArticlesBlock,
  HomepageBlockLayoutProps,
} from '../../../types'
import { AuthorLink } from '@/features/authors/components/AuthorLink'
import { NavigableImageTarget } from '../NavigableImageTarget'
import { PublicImage, PublicSource } from '@/components/media/PublicImage'
import { BLOCK_IMAGE_SIZES } from '../blockImageSizes'
import { isPriorityImage } from '../heroImagePriority'
import { BLOCK_TYPE, blockTitleLength } from '../blockType'

const PREVIEW_ARTICLE_COUNT = 3

type FeaturedArticlePlacement = 'center' | 'left'
type CompactArticlePlacement = 'right'

function joinClassNames(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

function getArticleTypeLabel(article: FeaturedArticleTeaser): string {
  return article.articleType ?? article.category?.name ?? 'Article'
}

function getAuthorLabel(article: FeaturedArticleTeaser): string {
  return article.author?.name || 'Questurian'
}

type FeaturedArticlePreviewCardProps = {
  article: FeaturedArticleTeaser
  isPriority: boolean
  placement?: FeaturedArticlePlacement
}

function FeaturedArticlePreviewCard({
  article,
  isPriority,
  placement,
}: FeaturedArticlePreviewCardProps): JSX.Element {
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
  const isLead = placement !== 'left'

  return (
    <section
      className={joinClassNames(
        'city-article-card grid gap-3 px-[var(--block-gutter)] py-4',
        placement ? `city-article-card--${placement}` : null,
      )}
    >
      <div className="city-article-image-shell relative aspect-square overflow-hidden bg-[#d7dcde] 768:aspect-[1200/630]">
        {hasImage ? (
          <picture className="block h-full w-full">
            {desktopImageUrl ? (
              <PublicSource media="(min-width: 768px)" src={desktopImageUrl} sizes={BLOCK_IMAGE_SIZES.featuredLeftCard} />
            ) : null}
            <PublicImage
              src={fallbackImageUrl}
              alt=""
              className="relative z-10 h-full w-full object-cover"
              decoding="async"
              fetchPriority={isPriority ? 'high' : 'auto'}
              loading={isPriority ? 'eager' : 'lazy'}
              sizes={BLOCK_IMAGE_SIZES.featuredLeftCard}
            />
          </picture>
        ) : null}
        <NavigableImageTarget href={article.articlePath} label={`Read ${article.title}`} />
      </div>

      <div className="city-article-content flex w-full flex-col justify-start py-0">
        <p className={BLOCK_TYPE.kicker}>
          {articleTypeLabel}
        </p>

        <h2
          className={`mt-2.5 max-w-2xl 768:max-w-none ${isLead ? BLOCK_TYPE.titleL : BLOCK_TYPE.titleM}`}
          data-title-length={isLead ? blockTitleLength(article.title) : undefined}
        >
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
          className={`mt-3 max-w-xl overflow-hidden 768:max-w-none [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] 768:[-webkit-line-clamp:3] ${isLead ? BLOCK_TYPE.dekLead : BLOCK_TYPE.dek}`}
        >
          {article.articlePath ? <Link href={article.articlePath}>{excerpt}</Link> : excerpt}
        </p>

        <p className={`mt-3.5 768:mt-4 ${BLOCK_TYPE.byline}`}>
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

type CompactArticlePreviewCardProps = {
  article: FeaturedArticleTeaser
  placement?: CompactArticlePlacement
  isPriority: boolean
}

function CompactArticlePreviewCard({
  article,
  placement,
  isPriority,
}: CompactArticlePreviewCardProps): JSX.Element {
  const imageUrl = article.imageUrlSquare ?? article.imageUrl ?? null
  const excerpt = article.excerpt ?? 'Meta description not set'
  const authorLabel = getAuthorLabel(article)

  return (
    <section
      className={joinClassNames(
        'city-compact-article-card px-[var(--block-gutter)] py-4',
        placement ? `city-compact-article-card--${placement}` : null,
      )}
    >
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
            fetchPriority={isPriority ? 'high' : 'auto'}
            loading={isPriority ? 'eager' : 'lazy'}
            sizes={BLOCK_IMAGE_SIZES.sideThumbnail}
          />
        ) : null}
        <NavigableImageTarget href={article.articlePath} label={`Read ${article.title}`} />
      </div>
    </section>
  )
}

function getArticleKey(article: FeaturedArticleTeaser, index: number): string {
  return [article.title, article.imageUrlSquare ?? article.imageUrl ?? index].join(':')
}

function RecommendedDivider(): JSX.Element {
  return (
    <div
      className="city-recommended-divider px-[var(--block-gutter)]"
      aria-label="Recommended articles"
    >
      <span className={`city-recommended-divider__label ${BLOCK_TYPE.byline}`}>Recommended</span>
    </div>
  )
}

export function FeaturedArticlesSevenArticlePreview({
  block,
  blockIndex,
}: HomepageBlockLayoutProps<FeaturedArticlesBlock>): JSX.Element | null {
  const previewArticles = block.items.slice(0, PREVIEW_ARTICLE_COUNT)
  const compactArticles = block.items.slice(PREVIEW_ARTICLE_COUNT)
  const centerArticle = block.items[0]
  const leftArticles = block.items.slice(1, 3)
  const rightArticles = block.items.slice(3, 7)

  if (previewArticles.length === 0 && compactArticles.length === 0) {
    return null
  }

  return (
    <section className="city-featured-seven-layout" aria-label="Featured articles">
      <div className="city-featured-seven-center">
        {centerArticle ? (
          <FeaturedArticlePreviewCard
            article={centerArticle}
            isPriority={isPriorityImage(blockIndex, 0)}
            key={getArticleKey(centerArticle, 0)}
            placement="center"
          />
        ) : null}
      </div>

      <div className="city-featured-seven-left">
        {leftArticles.map((article, index) => {
          const articleIndex = index + 1

          return (
            <FeaturedArticlePreviewCard
              article={article}
              isPriority={isPriorityImage(blockIndex, articleIndex)}
              key={getArticleKey(article, articleIndex)}
              placement="left"
            />
          )
        })}
      </div>

      <div className="city-featured-seven-right">
        {rightArticles.length > 0 ? <RecommendedDivider /> : null}
        {rightArticles.map((article, index) => {
          const articleIndex = index + PREVIEW_ARTICLE_COUNT

          return (
            <CompactArticlePreviewCard
              article={article}
              isPriority={isPriorityImage(blockIndex, articleIndex)}
              key={getArticleKey(article, articleIndex)}
              placement="right"
            />
          )
        })}
      </div>
    </section>
  )
}
