'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react'

import { adFrameDocument } from '../lib/adFrameDocument'
import {
  ADSTERRA_SCRIPT_ORIGIN,
  AD_SHAPES,
  adStepWidth,
  adUnitForWidth,
  type AdShape,
} from '../lib/adUnits'

/**
 * Sandbox for the ad's own document.
 *
 * - `allow-scripts`: the banner is a script.
 * - `allow-popups` + `allow-popups-to-escape-sandbox`: a click opens the
 *   advertiser in a new, ordinary tab.
 * - No `allow-same-origin`: the frame gets an opaque origin, so its code
 *   cannot touch the page, our storage or the reader's API session.
 * - No `allow-top-navigation`: an ad can never redirect the reader's page.
 *
 * If Adsterra ever refuses to serve into this (impressions stay at zero with
 * keys in), see docs/procedures/ads.md before loosening it.
 */
const SANDBOX = 'allow-scripts allow-popups allow-popups-to-escape-sandbox'

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
 * One live Adsterra banner, isolated in its own sandboxed document (see
 * `adFrameDocument`). Fills the box `AdSurface` reserved; mounts only once the
 * box is near the viewport, and swaps unit when its space crosses the shape's
 * threshold (the box changes size with it).
 */
export function AdsterraFrame({ shape }: { shape: AdShape }) {
  const holder = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  const viewportStep = useViewportStep(shape)
  const containerStep = useContainerStep(shape, holder)
  const width = AD_SHAPES[shape].measure === 'viewport' ? viewportStep : containerStep

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
      {near && unit ? (
        <iframe
          key={unit.name}
          title="Advertisement"
          sandbox={SANDBOX}
          srcDoc={adFrameDocument(unit, ADSTERRA_SCRIPT_ORIGIN)}
          width={unit.width}
          height={unit.height}
          scrolling="no"
          className="block border-0"
        />
      ) : null}
    </div>
  )
}
