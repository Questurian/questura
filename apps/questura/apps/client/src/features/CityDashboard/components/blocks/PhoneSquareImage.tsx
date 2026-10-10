import type { JSX } from 'react'

import { PublicImage, PublicSource } from '@/components/media/PublicImage'
import type { FeaturedArticleTeaser } from '../../types'
import type { ImagePriority } from './heroImagePriority'

/**
 * PHONE SQUARE RULE — on location pages, article images in homepage blocks
 * are square on phones (<768px) and keep their wide crop from 768px up.
 *
 * The square crop Payload makes for every photo (`imageUrlSquare`) is the
 * phone image; the frame around it must be square below 768px too
 * (`aspect-square 768:aspect-[…]` or the block's CSS).
 */
export const PHONE_SQUARE_MEDIA = '(min-width: 768px)'

type PhoneSquareImageProps = {
  article: FeaturedArticleTeaser
  sizes: string
  priority: ImagePriority
  className?: string
  onError?: () => void
}

export function PhoneSquareImage({
  article,
  sizes,
  priority,
  className = 'relative z-10 h-full w-full object-cover',
  onError,
}: PhoneSquareImageProps): JSX.Element | null {
  const squareUrl = article.imageUrlSquare ?? article.imageUrl ?? null
  const wideUrl = article.imageUrl ?? article.imageUrlSquare ?? null
  if (!squareUrl) return null

  return (
    <picture className="block h-full w-full">
      {wideUrl && wideUrl !== squareUrl ? (
        <PublicSource media={PHONE_SQUARE_MEDIA} src={wideUrl} sizes={sizes} />
      ) : null}
      <PublicImage
        src={squareUrl}
        alt=""
        className={className}
        decoding="async"
        {...priority}
        onError={onError}
        sizes={sizes}
      />
    </picture>
  )
}
