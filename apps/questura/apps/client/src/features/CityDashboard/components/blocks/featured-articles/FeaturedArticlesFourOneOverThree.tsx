import Link from '@/components/navigation/PublicLink'
import type { JSX } from 'react'

import type { FeaturedArticleTeaser } from '../../../types'
import { AuthorLink } from '@/features/authors/components/AuthorLink'
import { NavigableImageTarget } from '../NavigableImageTarget'
import { PublicImage, PublicSource } from '@/components/media/PublicImage'
import { BLOCK_IMAGE_SIZES } from '../blockImageSizes'
import { BLOCK_TYPE, blockTitleLength } from '../blockType'
import { LAZY_IMAGE, type ImagePriority } from '../heroImagePriority'

function getArticleTypeLabel(article: FeaturedArticleTeaser): string {
  return article.articleType ?? article.category?.name ?? 'Article'
}

function getArticleKey(article: FeaturedArticleTeaser, index: number): string {
  return [article.title, article.imageUrl ?? article.imageUrlSquare ?? index].join(':')
}

type CardProps = {
  article: FeaturedArticleTeaser
  lead: boolean
  imagePriority: ImagePriority
}

/** Lead (text beside a wide image) or one of the three columns below it. */
function OneOverThreeCard({ article, lead, imagePriority }: CardProps): JSX.Element {
  const squareImageUrl = article.imageUrlSquare ?? article.imageUrl ?? null
  const wideImageUrl = article.imageUrl ?? article.imageUrlSquare ?? null
  const fallbackImageUrl = squareImageUrl ?? wideImageUrl
  const sizes = lead ? BLOCK_IMAGE_SIZES.hero : BLOCK_IMAGE_SIZES.thirdColumn
  const excerpt = article.excerpt ?? null
  const articlePath = article.articlePath ?? null

  return (
    <article className={lead ? 'city-four-o3-lead' : 'city-four-o3-col'}>
      <div className="city-article-image-shell city-four-o3-image">
        {fallbackImageUrl ? (
          <picture className="block h-full w-full">
            {wideImageUrl ? (
              <PublicSource media="(min-width: 768px)" src={wideImageUrl} sizes={sizes} />
            ) : null}
            <PublicImage
              src={fallbackImageUrl}
              alt=""
              className="relative z-10 h-full w-full object-cover"
              decoding="async"
              {...imagePriority}
              sizes={sizes}
            />
          </picture>
        ) : null}
        <NavigableImageTarget href={articlePath} label={`Read ${article.title}`} />
      </div>

      <div className="city-four-o3-copy">
        <p className={BLOCK_TYPE.kicker}>{getArticleTypeLabel(article)}</p>
        <h3
          className={`city-four-o3-title ${lead ? BLOCK_TYPE.titleL : BLOCK_TYPE.titleM}`}
          data-title-length={lead ? blockTitleLength(article.title) : undefined}
        >
          {articlePath ? (
            <Link href={articlePath} className="hover:underline">
              {article.title}
            </Link>
          ) : (
            article.title
          )}
        </h3>
        {excerpt ? (
          <p data-article-dek className={`city-four-o3-dek ${lead ? BLOCK_TYPE.dekLead : BLOCK_TYPE.dek}`}>
            {articlePath ? <Link href={articlePath}>{excerpt}</Link> : excerpt}
          </p>
        ) : null}
        <p className={`city-four-o3-byline ${BLOCK_TYPE.byline}`}>
          By{' '}
          <AuthorLink
            authorSlug={article.author?.slug}
            authorId={article.author?.id}
            className="hover:underline"
          >
            {article.author?.name || 'Questurian'}
          </AuthorLink>
        </p>
      </div>
    </article>
  )
}

type FeaturedArticlesFourOneOverThreeProps = {
  items: FeaturedArticleTeaser[]
  imagePriority: ImagePriority
}

/**
 * 4-slot "lead row, then three columns": slot 1 is a lead row (copy left,
 * wide image right), slots 2-4 sit in three columns under a hairline.
 * Phones stack everything in slot order.
 */
export function FeaturedArticlesFourOneOverThree({
  items,
  imagePriority,
}: FeaturedArticlesFourOneOverThreeProps): JSX.Element {
  const [lead, ...columns] = items.slice(0, 4)

  return (
    <div className="city-featured-four-o3-layout">
      {lead ? <OneOverThreeCard article={lead} lead imagePriority={imagePriority} /> : null}
      <div className="city-four-o3-columns">
        {columns.map((article, index) => (
          <OneOverThreeCard
            key={getArticleKey(article, index + 1)}
            article={article}
            lead={false}
            imagePriority={LAZY_IMAGE}
          />
        ))}
      </div>
    </div>
  )
}
