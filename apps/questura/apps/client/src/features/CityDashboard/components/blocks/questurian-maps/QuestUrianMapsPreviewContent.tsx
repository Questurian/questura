'use client'

import { useState, type JSX } from 'react'

import Link from '@/components/navigation/PublicLink'
import { AuthorLink } from '@/features/authors/components/AuthorLink'
import type { CityHomepageArticleBlock, FeaturedArticleTeaser, HomepageBlockLayoutProps } from '../../../types'
import { BLOCK_TYPE } from '../blockType'
import { ArticleKickerLabel, MapsPin } from '../ArticleKickerLabel'
import { BlockSection } from '../BlockSection'
import { BLOCK_IMAGE_SIZES } from '../blockImageSizes'
import { EAGER_IMAGE, LAZY_IMAGE, isPriorityImage } from '../heroImagePriority'
import { NavigableImageTarget } from '../NavigableImageTarget'
import { PhoneSquareImage } from '../PhoneSquareImage'
import styles from './QuesturaMaps.module.css'

function MapCard({ item, isPriority }: { item: FeaturedArticleTeaser; isPriority: boolean }): JSX.Element {
  const [failed, setFailed] = useState(false)
  const widePhoto = item.imageWide?.url || item.imageUrl
  const author = item.author
  const name = author?.name?.trim()

  return (
    <article className={styles.card}>
      <div className={styles.photo}>
        {!failed && (
          <PhoneSquareImage
            article={{ ...item, imageUrl: widePhoto }}
            sizes={BLOCK_IMAGE_SIZES.mapCard}
            priority={isPriority ? EAGER_IMAGE : LAZY_IMAGE}
            onError={() => setFailed(true)}
          />
        )}
        <NavigableImageTarget href={item.articlePath} label={`Open ${item.title}`} />
      </div>
      <div className={styles.copy}>
        <p className={BLOCK_TYPE.kicker}><ArticleKickerLabel label="Maps" /></p>
        <h3 className={styles.title}>
          {item.articlePath ? <Link href={item.articlePath}>{item.title}</Link> : item.title}
        </h3>
        {name && (
          <p className={styles.byline}>
            By <AuthorLink authorSlug={author?.slug} authorId={author?.id} className="hover:underline">{name}</AuthorLink>
          </p>
        )}
      </div>
    </article>
  )
}

export function QuestUrianMapsPreview({
  block,
  blockIndex,
}: HomepageBlockLayoutProps<CityHomepageArticleBlock>): JSX.Element | null {
  if (!block.items?.length) return null

  return (
    <BlockSection className={styles.section} aria-label="Questura Maps">
      <h2 className={styles.heading}><MapsPin />Questura Maps</h2>
      <div className={styles.grid}>
        {block.items.map((item, index) => (
          <MapCard
            key={`${item.articlePath ?? item.title}-${item.imageWide?.url ?? item.imageUrl ?? item.imageUrlSquare ?? ''}-${index}`}
            item={item}
            isPriority={isPriorityImage(blockIndex, index)}
          />
        ))}
      </div>
    </BlockSection>
  )
}
