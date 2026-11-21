'use client'

import { useEffect, useRef, useState, type JSX } from 'react'
import { PublicImage, type PublicImageProps } from '@/components/media/PublicImage'

type ShimmerImageProps = PublicImageProps & {
  wrapperClassName?: string
}

type ImageState = 'loading' | 'loaded' | 'failed'

export function ShimmerImage({
  src,
  className,
  wrapperClassName,
  onError,
  onLoad,
  ...props
}: ShimmerImageProps): JSX.Element {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [imageState, setImageState] = useState<ImageState>('loading')

  // The frame shows the flat placeholder and the photo fades in over it once
  // it has fully arrived; that needs no React (lib/media/photoReady.ts), so
  // this state never decides whether the photo is visible (#594). It only
  // styles a failure. Cached images can finish before hydration attaches
  // onLoad, so reconcile after every src change too.
  useEffect(() => {
    setImageState('loading')
    const image = wrapperRef.current?.querySelector('img')
    if (!image?.complete) return
    setImageState(image.naturalWidth > 0 ? 'loaded' : 'failed')
  }, [src])

  return (
    <div
      ref={wrapperRef}
      className={`shimmer-image ${wrapperClassName ?? ''}`}
      data-image-state={imageState}
    >
      <PublicImage
        {...props}
        src={src}
        className={className}
        onError={(event) => {
          setImageState('failed')
          onError?.(event)
        }}
        onLoad={(event) => {
          setImageState('loaded')
          onLoad?.(event)
        }}
      />
    </div>
  )
}
