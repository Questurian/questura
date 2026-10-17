'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react'

import { adsMayLoad } from '../lib/adConsent'
import { AD_SHAPES, adFrameUrl, adStepWidth, adUnitForWidth, type AdShape } from '../lib/adUnits'
import { useAdConsent } from './useAdConsent'

/**
 * Sandbox for the ad's own document, which loads from ads.questurian.com.
 *
 * - `allow-scripts`: the banner is a script.
 * - `allow-same-origin`: lets the frame keep *its own* origin,
 *   ads.questurian.com, whose storage and cookies Adsterra's script needs (it
 *   fails without them). Safe only because that is a different origin from the
 *   site: never put this flag on a frame whose document is the site's own
 *   (`srcdoc`, `about:blank`, a page of ours).
 * - `allow-popups` + `allow-popups-to-escape-sandbox`: a click opens the
 *   advertiser in a new, ordinary tab.
 * - No `allow-top-navigation`: an ad can never redirect the reader's page.
 */
const SANDBOX = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox'

/** Start loading a little before the slot scrolls in, so it is ready on arrival. */
const NEAR_VIEWPORT = '300px 0px'

/**
 * The step a viewport-measured shape is on, as that step's smallest width.
 * Null on the server and while hydrating: the frame only mounts in the browser.
 */
function viewportQueries(shape: AdShape): Array<{ minWidth: number; query: string }> {
  const { measure, steps } = AD_SHAPES[shape]
  if (measure !== 'viewport') return []
  return steps
    .filter((step) => step.minWidth > 0)
    .map((step) => ({ minWidth: step.minWidth, query: `(min-width: ${step.minWidth}px)` }))
}

function useViewportStep(shape: AdShape): number | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const lists = viewportQueries(shape).map(({ query }) => window.matchMedia(query))
      lists.forEach((list) => list.addEventListener('change', onChange))
      return () => lists.forEach((list) => list.removeEventListener('change', onChange))
    },
    [shape],
  )
  const read = useCallback(() => {
    let width = 0
    for (const { minWidth, query } of viewportQueries(shape)) {
      if (window.matchMedia(query).matches) width = minWidth
    }
    return width
  }, [shape])
  return useSyncExternalStore(subscribe, read, () => null)
}

/**
 * The step a container-measured shape is on: the width of the slot's
 * `@container` wrapper (`AdSurface`), the same box its CSS sizes against.
 */
function useContainerStep(shape: AdShape, holder: RefObject<HTMLDivElement | null>): number | null {
  const [step, setStep] = useState<number | null>(null)
  const measured = AD_SHAPES[shape].measure === 'container'

  useEffect(() => {
    const container = holder.current?.closest<HTMLElement>('[data-ad-container]')
    if (!measured || !container) return
    const read = () => setStep(adStepWidth(shape, container.getBoundingClientRect().width))
    read()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(read)
    observer.observe(container)
    return () => observer.disconnect()
  }, [holder, measured, shape])

  return step
}

/**
 * One live Adsterra banner, in its own frame on the ad frame origin (see
 * `adFrameResponse`). Fills the box `AdSurface` reserved; mounts only once the
 * box is near the viewport and the visitor's consent allows it
 * (`lib/adConsent.ts`), and swaps unit when its space crosses the shape's
 * threshold (the box changes size with it).
 */
export function AdsterraFrame({ shape }: { shape: AdShape }) {
  const holder = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  const viewportStep = useViewportStep(shape)
  const containerStep = useContainerStep(shape, holder)
  const width = AD_SHAPES[shape].measure === 'viewport' ? viewportStep : containerStep
  const consent = useAdConsent()

  useEffect(() => {
    const element = holder.current
    if (!element || near) return
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: NEAR_VIEWPORT },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [near])

  const unit = width === null ? null : adUnitForWidth(shape, width)

  return (
    <div ref={holder} className="flex h-full w-full justify-center">
      {near && unit && adsMayLoad(consent) ? (
        <iframe
          key={unit.name}
          title="Advertisement"
          sandbox={SANDBOX}
          src={adFrameUrl(unit)}
          referrerPolicy="strict-origin-when-cross-origin"
          width={unit.width}
          height={unit.height}
          scrolling="no"
          className="block border-0"
        />
      ) : null}
    </div>
  )
}
