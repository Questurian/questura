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

type CenterLeadCardProps = {
  article: FeaturedArticleTeaser
  lead: boolean
  imagePriority: ImagePriority
}

/** One story: wide image on tablet/desktop (square crop on phones), then copy. */
function CenterLeadCard({ article, lead, imagePriority }: CenterLeadCardProps): JSX.Element {
  const squareImageUrl = article.imageUrlSquare ?? article.imageUrl ?? null
  const wideImageUrl = article.imageUrl ?? article.imageUrlSquare ?? null
  const fallbackImageUrl = squareImageUrl ?? wideImageUrl
  const sizes = lead ? BLOCK_IMAGE_SIZES.centreLead : BLOCK_IMAGE_SIZES.quarterColumn
  const excerpt = article.excerpt ?? null
  const articlePath = article.articlePath ?? null

  return (
    <article className={`city-five-cl-card${lead ? ' city-five-cl-card--lead' : ''}`}>
      <div className="city-article-image-shell city-five-cl-image">
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

      <div className="city-five-cl-copy">
        <p className={BLOCK_TYPE.kicker}>{getArticleTypeLabel(article)}</p>
        <h3
          className={`city-five-cl-title ${lead ? BLOCK_TYPE.titleL : BLOCK_TYPE.titleM}`}
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
          <p data-article-dek className={`city-five-cl-dek ${lead ? BLOCK_TYPE.dekLead : BLOCK_TYPE.dek}`}>
            {articlePath ? <Link href={articlePath}>{excerpt}</Link> : excerpt}
          </p>
        ) : null}
        <p className={`city-five-cl-byline ${BLOCK_TYPE.byline}`}>
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

type FeaturedArticlesFiveCenterLeadProps = {
  items: FeaturedArticleTeaser[]
  imagePriority: ImagePriority
}

/**
 * 5-slot "center lead": slot 1 is a wide lead in the centre column, slots 2-3
 * stack on the left and 4-5 on the right, with hairline rules between the
 * columns. Tablet puts the lead on top over a 2x2; phones stack in slot order.
 */
export function FeaturedArticlesFiveCenterLead({
  items,
  imagePriority,
}: FeaturedArticlesFiveCenterLeadProps): JSX.Element {
  const [lead, ...rest] = items.slice(0, 5)
  const left = rest.slice(0, 2)
  const right = rest.slice(2, 4)

  return (
    <div className="city-featured-five-cl-layout">
      {lead ? (
        <div className="city-five-cl-center">
          <CenterLeadCard article={lead} lead imagePriority={imagePriority} />
        </div>
      ) : null}
      <div className="city-five-cl-side city-five-cl-side--left">
        {left.map((article, index) => (
          <CenterLeadCard key={getArticleKey(article, index + 1)} article={article} lead={false} imagePriority={LAZY_IMAGE} />
        ))}
      </div>
      <div className="city-five-cl-side city-five-cl-side--right">
        {right.map((article, index) => (
          <CenterLeadCard key={getArticleKey(article, index + 3)} article={article} lead={false} imagePriority={LAZY_IMAGE} />
        ))}
      </div>
    </div>
  )
}
