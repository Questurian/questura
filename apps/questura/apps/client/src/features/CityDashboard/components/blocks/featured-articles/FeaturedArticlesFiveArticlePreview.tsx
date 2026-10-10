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
import { PublicImage } from '@/components/media/PublicImage'
import { BLOCK_IMAGE_SIZES } from '../blockImageSizes'
import { heroImagePriority, type ImagePriority } from '../heroImagePriority'
import { FeaturedArticlesFiveCenterLead } from './FeaturedArticlesFiveCenterLead'

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

type MagazineHeroCardProps = {
  article: FeaturedArticleTeaser
  imagePriority: ImagePriority
}

/** Slot 1: magazine hero — square image over serif title, dek, byline. */
function MagazineHeroCard({ article, imagePriority }: MagazineHeroCardProps): JSX.Element {
  const imageUrl = article.imageUrlSquare ?? article.imageUrl ?? null

  const articleTypeLabel = getArticleTypeLabel(article)
  const excerpt = article.excerpt ?? 'Meta description not set'
  const authorLabel = getAuthorLabel(article)
  const articlePath = article.articlePath ?? null

  return (
    <section className="city-article-card city-five-hero-card">
      <div className="city-article-image-shell city-five-hero-image relative aspect-square overflow-hidden bg-[#d7dcde]">
        {imageUrl ? (
          <PublicImage
            src={imageUrl}
            alt=""
            className="relative z-10 h-full w-full object-cover"
            decoding="async"
            {...imagePriority}
            sizes={BLOCK_IMAGE_SIZES.hero}
          />
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

type SidebarMediaCardProps = {
  article: FeaturedArticleTeaser
}

/** Slot 2: sidebar media row — square thumb with label, title, byline. */
function SidebarMediaCard({ article }: SidebarMediaCardProps): JSX.Element {
  const imageUrl = article.imageUrlSquare ?? article.imageUrl ?? null

  const articleTypeLabel = getArticleTypeLabel(article)
  const authorLabel = getAuthorLabel(article)
  const articlePath = article.articlePath ?? null

  return (
    <section className="city-five-side-media">
      <div className="city-article-image-shell city-five-side-thumb">
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
        <NavigableImageTarget href={articlePath} label={`Read ${article.title}`} />
      </div>

      <div className="city-five-side-copy">
        <p className={`city-five-side-type ${BLOCK_TYPE.kicker}`}>{articleTypeLabel}</p>
        <h3 className={`city-five-side-title ${BLOCK_TYPE.titleM}`}>
          {articlePath ? (
            <Link href={articlePath} className="hover:underline">
              {article.title}
            </Link>
          ) : (
            article.title
          )}
        </h3>
        <p className={`city-five-side-author ${BLOCK_TYPE.byline}`}>
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

type SidebarTextRowProps = {
  article: FeaturedArticleTeaser
}

/** Slots 3-5: text-only sidebar rows. */
function SidebarTextRow({ article }: SidebarTextRowProps): JSX.Element {
  const articleTypeLabel = getArticleTypeLabel(article)
  const excerpt = article.excerpt ?? 'Meta description not set'
  const authorLabel = getAuthorLabel(article)
  const articlePath = article.articlePath ?? null

  return (
    <section className="city-five-side-text">
      <p className={`city-five-side-type ${BLOCK_TYPE.kicker}`}>{articleTypeLabel}</p>
      <h3 className={`city-five-side-title ${BLOCK_TYPE.titleS}`}>
        {articlePath ? (
          <Link href={articlePath} className="hover:underline">
            {article.title}
          </Link>
        ) : (
          article.title
        )}
      </h3>
      <p data-article-dek className={`city-five-side-dek ${BLOCK_TYPE.dek}`}>
        {articlePath ? <Link href={articlePath}>{excerpt}</Link> : excerpt}
      </p>
      <p className={`city-five-side-author ${BLOCK_TYPE.byline}`}>
        <AuthorLink
          authorSlug={article.author?.slug}
          authorId={article.author?.id}
          className="hover:underline"
        >
          {authorLabel}
        </AuthorLink>
      </p>
    </section>
  )
}

export function FeaturedArticlesFiveArticlePreview({
  block,
  blockIndex,
}: HomepageBlockLayoutProps<FeaturedArticlesBlock>): JSX.Element | null {
  const imagePriority = heroImagePriority(blockIndex)

  if (block.items.length === 0) return null

  const heroArticle = block.items[0]
  const mediaArticle = block.items[1] ?? null
  const textArticles = block.items.slice(2, 5)
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

      {block.slot5Layout === 'center-lead' ? (
        <FeaturedArticlesFiveCenterLead items={block.items} imagePriority={imagePriority} />
      ) : (
        <div className="city-featured-five-layout">
          <div className="city-featured-five-hero">
            {heroArticle ? (
              <MagazineHeroCard
                key={getArticleKey(heroArticle, 0)}
                article={heroArticle}
                imagePriority={imagePriority}
              />
            ) : null}
          </div>

          <div className="city-featured-five-sidebar">
            {mediaArticle ? (
              <SidebarMediaCard key={getArticleKey(mediaArticle, 1)} article={mediaArticle} />
            ) : null}
            {textArticles.map((article, index) => (
              <SidebarTextRow key={getArticleKey(article, index + 2)} article={article} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
