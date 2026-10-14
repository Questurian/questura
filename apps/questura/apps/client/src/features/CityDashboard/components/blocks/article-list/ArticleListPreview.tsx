import Link from '@/components/navigation/PublicLink'
import type { JSX } from 'react'

import type {
  ArticleListBlock,
  ArticleListLayout,
  FeaturedArticleTeaser,
  HomepageBlockLayoutProps,
} from '../../../types'
import { BlockSection } from '../BlockSection'
import { AuthorLink } from '@/features/authors/components/AuthorLink'
import { NavigableImageTarget } from '../NavigableImageTarget'
import { PublicImage } from '@/components/media/PublicImage'
import { BLOCK_IMAGE_SIZES } from '../blockImageSizes'
import { heroImagePriority, type ImagePriority } from '../heroImagePriority'
import { BlockSectionHeader } from '../BlockSectionHeader'
import { BLOCK_TYPE } from '../blockType'
import { ArticleKickerLabel } from '../ArticleKickerLabel'

function getArticleTypeLabel(article: FeaturedArticleTeaser): string {
  return article.articleType ?? article.category?.name ?? 'Article'
}

function getAuthorLabel(article: FeaturedArticleTeaser): string {
  return article.author?.name || 'Questurian'
}

function getArticleKey(article: FeaturedArticleTeaser, index: number): string {
  return [article.title, article.imageUrlSquare ?? article.imageUrl ?? index].join(':')
}

type ArticleRowProps = {
  article: FeaturedArticleTeaser
  imagePriority: ImagePriority
  layout: ArticleListLayout
}

function ArticleCopy({ article }: { article: FeaturedArticleTeaser }): JSX.Element {
  const excerpt = article.excerpt ?? null
  const articlePath = article.articlePath ?? null

  return (
    <div className="min-w-0 flex-1">
      <p className={BLOCK_TYPE.kicker}>
        <ArticleKickerLabel label={getArticleTypeLabel(article)} />
      </p>

      <h3 className={`mt-2 ${BLOCK_TYPE.titleM}`}>
        {articlePath ? <Link href={articlePath}>{article.title}</Link> : article.title}
      </h3>

      {excerpt ? (
        <p data-article-dek className={`mt-2 ${BLOCK_TYPE.dek}`}>
          {articlePath ? <Link href={articlePath}>{excerpt}</Link> : excerpt}
        </p>
      ) : null}

      <p className={`mt-3 ${BLOCK_TYPE.byline}`}>
        By <AuthorLink authorSlug={article.author?.slug} authorId={article.author?.id} className="hover:underline">{getAuthorLabel(article)}</AuthorLink>
      </p>
    </div>
  )
}

function ArticleThumb({
  article,
  imagePriority,
  className,
  sizes,
}: {
  article: FeaturedArticleTeaser
  imagePriority: ImagePriority
  className: string
  sizes: string
}): JSX.Element {
  const imageUrl = article.imageUrlSquare ?? article.imageUrl ?? null

  return (
    <div className={`relative aspect-square shrink-0 overflow-hidden bg-[#d7dcde] ${className}`}>
      {imageUrl ? (
        <PublicImage
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          decoding="async"
          {...imagePriority}
          sizes={sizes}
        />
      ) : null}
      <NavigableImageTarget href={article.articlePath ?? null} label={`Read ${article.title}`} />
    </div>
  )
}

function ArticleRow({ article, imagePriority, layout }: ArticleRowProps): JSX.Element {
  if (layout === 'square-with-ad') {
    // Square image first, copy beside it: top-aligned on phones, where the
    // copy outgrows the image, and centred on the image from 768.
    return (
      <article className="flex items-start gap-4 py-6 768:items-center 768:gap-8 768:py-8">
        <ArticleThumb
          article={article}
          imagePriority={imagePriority}
          className="w-[112px] 768:w-[220px] 1024:w-[240px] 1280:w-[300px]"
          sizes={BLOCK_IMAGE_SIZES.listSquare}
        />
        <ArticleCopy article={article} />
      </article>
    )
  }

  return (
    <article className="flex items-start gap-4 py-6 768:gap-8 768:py-8 1024:py-10">
      <ArticleCopy article={article} />
      <ArticleThumb
        article={article}
        imagePriority={imagePriority}
        className="w-[120px] 768:w-[150px] 1024:w-[180px]"
        sizes={BLOCK_IMAGE_SIZES.listThumbnail}
      />
    </article>
  )
}

/**
 * The ad rail beside a square-with-ad list (1024+). It reserves a standard
 * 300×600 half-page slot and sticks while the list scrolls past. No ad network
 * is wired yet: in production the rail is empty space; in development it shows
 * an outline so the slot can be seen while laying pages out.
 */
function AdRail(): JSX.Element {
  const showOutline = process.env.NODE_ENV !== 'production'

  return (
    <aside aria-label="Advertisement" className="hidden 1024:block">
      <div
        data-ad-slot="article-list-rail"
        className={`sticky top-24 mt-8 h-[600px] w-[300px] ${
          showOutline
            ? 'flex items-center justify-center border border-dashed border-[#c9c1b4] font-[family-name:var(--font-dm-sans)] text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[#8a8178]'
            : ''
        }`}
      >
        {showOutline ? 'Ad · 300 × 600' : null}
      </div>
    </aside>
  )
}

export function ArticleListPreview({
  block,
  blockIndex,
}: HomepageBlockLayoutProps<ArticleListBlock>): JSX.Element | null {
  if (block.items.length === 0) return null

  // The first block on the page is the screen the reader lands on; a list
  // five blocks down can wait for the browser to ask.
  const heroPriority = heroImagePriority(blockIndex)

  const layout: ArticleListLayout = block.articleListLayout === 'square-with-ad' ? 'square-with-ad' : 'standard'
  const sectionHeading = block.sectionHeading?.trim() || null
  const sectionSubheading = block.sectionSubheading?.trim() || null

  const rows = (
    <div className="min-w-0 divide-y divide-[#d9d3c9]">
      {block.items.map((article, index) => (
        <ArticleRow
          key={getArticleKey(article, index)}
          article={article}
          imagePriority={heroPriority}
          layout={layout}
        />
      ))}
    </div>
  )

  return (
    <BlockSection className="bg-[#f5f0e8]" contentClassName="pb-6 pt-8" aria-label="Article list">
        {sectionHeading ? (
          <BlockSectionHeader heading={sectionHeading} subheading={sectionSubheading} className="mb-4 pb-2" />
        ) : null}

        {layout === 'square-with-ad' ? (
          <div className="1024:grid 1024:grid-cols-[minmax(0,1fr)_300px] 1024:gap-12 1280:gap-16">
            {rows}
            <AdRail />
          </div>
        ) : (
          rows
        )}
    </BlockSection>
  )
}
