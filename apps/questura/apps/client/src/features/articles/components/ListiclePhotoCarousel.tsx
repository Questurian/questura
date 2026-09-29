'use client'

import { useEffect, useRef, useState, type JSX, type UIEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ShimmerImage } from '@/components/media/ShimmerImage'
import type { ListicleItemImage } from '@/features/articles/lib/listicleItemHelpers'

/** How long each photo stays up while the carousel is advancing by itself. */
const AUTO_ADVANCE_MS = 4500

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export function ListiclePhotoCarousel({
  images,
  autoAdvance = false,
}: {
  images: ListicleItemImage[]
  /**
   * Step through the photos on a loop, with a thin progress bar along the top.
   * The itinerary turns this on for the stop the map is showing. It pauses
   * while the pointer or keyboard focus is on the photos, and never runs for
   * a reader who asked for reduced motion.
   */
  autoAdvance?: boolean
}): JSX.Element | null {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  // The slideshow runs through the photos once. After it has slid back round
  // to the first, it stays there.
  const [finished, setFinished] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const imageKey = images.map((image) => image.url).join('|')

  useEffect(() => {
    setActiveIndex(0)
    setFinished(false)
    viewportRef.current?.scrollTo({ left: 0 })
  }, [imageKey])

  if (images.length === 0) return null

  function scrollToImage(index: number): void {
    const viewport = viewportRef.current
    if (!viewport) return

    const nextIndex = Math.max(0, Math.min(images.length - 1, index))
    viewport.scrollTo({
      left: nextIndex * viewport.clientWidth,
      behavior: 'smooth',
    })
    setActiveIndex(nextIndex)
  }

  function syncActiveImage(event: UIEvent<HTMLDivElement>): void {
    const viewport = event.currentTarget
    if (viewport.clientWidth === 0) return
    const index = Math.round(viewport.scrollLeft / viewport.clientWidth)
    // Past the last photo is the copy of the first (see `advancing` below).
    setActiveIndex(index >= images.length ? 0 : index)
  }

  const hasMultipleImages = images.length > 1
  const advancing = autoAdvance && hasMultipleImages && !reducedMotion && !finished

  // The bar's animation is the timer: when it finishes, the next photo comes
  // up and a new key restarts the bar. Pausing the animation pauses the timer
  // with it. After the last photo the strip keeps sliding the same way onto a
  // copy of the first, then jumps (unseen) to the real first and stops, so
  // the loop never scrolls backwards across every photo.
  function advance(): void {
    if (activeIndex + 1 < images.length) {
      scrollToImage(activeIndex + 1)
      return
    }
    const viewport = viewportRef.current
    if (!viewport) return
    viewport.scrollTo({ left: images.length * viewport.clientWidth, behavior: 'smooth' })
    setActiveIndex(0)
    window.setTimeout(() => {
      viewport.scrollTo({ left: 0, behavior: 'instant' })
      setFinished(true)
    }, 700)
  }

  return (
    <div
      className="relative overflow-hidden rounded-sm bg-foreground/[0.04]"
      onPointerEnter={advancing ? () => setPaused(true) : undefined}
      onPointerLeave={advancing ? () => setPaused(false) : undefined}
      onFocus={advancing ? () => setPaused(true) : undefined}
      onBlur={advancing ? () => setPaused(false) : undefined}
      role={hasMultipleImages ? 'region' : undefined}
      aria-roledescription={hasMultipleImages ? 'carousel' : undefined}
      aria-label={hasMultipleImages ? 'Venue photos' : undefined}
    >
      <div
        ref={viewportRef}
        className={`listicle-photo-carousel flex w-full snap-x snap-mandatory overflow-x-auto ${
          hasMultipleImages ? 'scroll-smooth' : ''
        }`}
        onScroll={hasMultipleImages ? syncActiveImage : undefined}
      >
        {images.map((image, index) => (
          <div
            key={`${image.url}-${index}`}
            className="aspect-[16/10] w-full min-w-full snap-center 380:aspect-[4/3] 480:aspect-[3/2] sm:aspect-[16/9]"
            role={hasMultipleImages ? 'group' : undefined}
            aria-roledescription={hasMultipleImages ? 'slide' : undefined}
            aria-label={hasMultipleImages ? `${index + 1} of ${images.length}` : undefined}
          >
            <ShimmerImage
              src={image.url}
              alt={image.alt}
              width={1200}
              height={675}
              sizes="(min-width: 768px) 700px, 100vw"
              className="h-full w-full object-cover"
              wrapperClassName="h-full w-full"
              loading="lazy"
              decoding="async"
            />
          </div>
        ))}
        {advancing ? (
          <div
            aria-hidden
            className="aspect-[16/10] w-full min-w-full snap-center 380:aspect-[4/3] 480:aspect-[3/2] sm:aspect-[16/9]"
          >
            <ShimmerImage
              src={images[0].url}
              alt=""
              width={1200}
              height={675}
              sizes="(min-width: 768px) 700px, 100vw"
              className="h-full w-full object-cover"
              wrapperClassName="h-full w-full"
              loading="lazy"
              decoding="async"
            />
          </div>
        ) : null}
      </div>

      {advancing ? (
        <div className="absolute inset-x-0 top-0 z-[2] h-[3px] bg-black/20" aria-hidden>
          <div
            key={`${activeIndex}-${imageKey}`}
            className="h-full origin-left bg-[var(--maps-listicle-accent)]"
            style={{
              animation: `listicle-photo-progress ${AUTO_ADVANCE_MS}ms linear forwards`,
              animationPlayState: paused ? 'paused' : 'running',
            }}
            onAnimationEnd={advance}
          />
        </div>
      ) : null}

      {hasMultipleImages ? (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            disabled={activeIndex === 0}
            className="absolute left-2 top-1/2 z-[1] inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/45 text-white shadow-sm transition enabled:hover:bg-black/60 disabled:opacity-30 480:left-3 480:size-10"
            onClick={() => scrollToImage(activeIndex - 1)}
          >
            <ChevronLeft className="size-5" strokeWidth={1.8} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            disabled={activeIndex === images.length - 1}
            className="absolute right-2 top-1/2 z-[1] inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/45 text-white shadow-sm transition enabled:hover:bg-black/60 disabled:opacity-30 480:right-3 480:size-10"
            onClick={() => scrollToImage(activeIndex + 1)}
          >
            <ChevronRight className="size-5" strokeWidth={1.8} aria-hidden />
          </button>
          <span
            className="absolute bottom-2 right-2 z-[1] rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold leading-none text-white 480:bottom-3 480:right-3 480:text-[11px]"
            aria-live="polite"
          >
            {activeIndex + 1} / {images.length}
          </span>
        </>
      ) : null}
    </div>
  )
}
