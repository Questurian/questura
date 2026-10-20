'use client'

import type { JSX } from 'react'
import dynamic from 'next/dynamic'
import type { ListicleItemImage } from '@/features/articles/lib/listicleItemHelpers'

/**
 * Its own chunk, still drawn on the server: article pages sit at the
 * first-load JavaScript cap (perf/budgets.json), and only an article with an
 * Airbnb needs the carousel. The split lives in this client module because a
 * server component's dynamic import still ships with the page.
 */
const ListiclePhotoCarousel = dynamic(
  () =>
    import('@/features/articles/components/ListiclePhotoCarousel').then(
      (module) => module.ListiclePhotoCarousel,
    ),
  { loading: () => <PhotoFrame /> },
)

/** The carousel's footprint, held while its code arrives after a client-side navigation. */
function PhotoFrame(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="aspect-[16/10] w-full bg-foreground/[0.04] 380:aspect-[4/3] 480:aspect-[3/2] sm:aspect-[16/9]"
    />
  )
}

/**
 * A stay box's photos: the listicle carousel, set flush with the box's edges
 * (`.stay-box-photos`, article-prose-and-media.css).
 */
export function StayBoxGallery({ images }: { images: ListicleItemImage[] }): JSX.Element {
  return (
    <div className="stay-box-photos">
      <ListiclePhotoCarousel images={images} />
    </div>
  )
}
