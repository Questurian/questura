'use client'

import { useEffect, useState, type CSSProperties, type JSX, type ReactNode } from 'react'

import { PublicImage } from '@/components/media/PublicImage'

/**
 * A pile of photo prints. The top print is taken off every few seconds and
 * slid under the pile, so the one beneath straightens and comes up. The words
 * (`children`) stay put over the pile while the photos change under them.
 *
 * Nothing moves under prefers-reduced-motion: the pile stays as first drawn.
 */
const SHUFFLE_EVERY_MS = 4500
const LEAVE_MS = 800

/** Where a print sits by its depth in the pile (0 = top). */
const POSES = [
  'translate(0, 0) rotate(0deg)',
  'translate(-1.1%, 1.6%) rotate(-2.2deg)',
  'translate(1.3%, -1.2%) rotate(1.7deg)',
  'translate(0.4%, 2.4%) rotate(-0.8deg)',
]
const LEAVING_POSE = 'translate(-6%, 9%) rotate(-7deg)'

const PILE_SIZES = '(min-width: 1400px) 1352px, calc(100vw - 48px)'

export function SectionPhotoStack({
  photos,
  children,
}: {
  photos: readonly string[]
  children: ReactNode
}): JSX.Element {
  const [top, setTop] = useState(0)
  // True while the print just taken off the top is sliding away.
  const [shuffling, setShuffling] = useState(false)
  const leaving = shuffling ? (top - 1 + photos.length) % photos.length : null

  useEffect(() => {
    if (photos.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let leaveTimer: number | undefined
    const shuffle = window.setInterval(() => {
      if (document.hidden) return
      setTop((current) => (current + 1) % photos.length)
      setShuffling(true)
      window.clearTimeout(leaveTimer)
      leaveTimer = window.setTimeout(() => setShuffling(false), LEAVE_MS)
    }, SHUFFLE_EVERY_MS)

    return () => {
      window.clearInterval(shuffle)
      window.clearTimeout(leaveTimer)
    }
  }, [photos.length])

  return (
    <div className="relative">
      <div aria-hidden="true" className="relative aspect-[4/3] 768:aspect-[2/1] 1024:aspect-[5/2]">
        {photos.map((src, index) => {
          const depth = (index - top + photos.length) % photos.length
          const isLeaving = index === leaving
          const style: CSSProperties = {
            zIndex: isLeaving ? photos.length + 1 : photos.length - depth,
            transform: isLeaving ? LEAVING_POSE : POSES[Math.min(depth, POSES.length - 1)],
            opacity: isLeaving ? 0 : 1,
          }

          return (
            <div
              key={src}
              className="absolute inset-0 overflow-hidden rounded-[12px] bg-background-warm shadow-[0_22px_44px_-28px_rgb(26_26_26/0.6)] transition-[transform,opacity] duration-[900ms] ease-[cubic-bezier(0.2,0.7,0.2,1)]"
              style={style}
            >
              <PublicImage
                src={src}
                alt=""
                sizes={PILE_SIZES}
                className="h-full w-full object-cover"
                loading={index < 2 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : undefined}
              />
              <span className="absolute inset-0 bg-[rgb(26_26_26/0.3)]" />
            </div>
          )
        })}
      </div>
      <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center px-6 text-center">
        {children}
      </div>
    </div>
  )
}
