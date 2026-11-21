'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type JSX } from 'react'
import { CornerUpLeft, MapPin } from 'lucide-react'
import { ListicleMapSwitch } from '@/features/articles/components/ListicleMapSwitch'
import type { ListicleMapGuides } from '@/features/articles/components/ListicleMapGuidesMenu'
import { MapPanel } from '@/features/articles/components/MapPanel'
import { ListicleMapVenueCard } from '@/features/articles/components/ListicleMapVenueCard'
import { useListicleMapSync } from '@/features/articles/components/ListicleMapSync'
import {
  adjacentStops,
  type SwipeDirection,
} from '@/features/articles/components/ListicleMapSwipe'
import { useOneFingerSwipe } from '@/features/articles/components/useOneFingerSwipe'
import {
  coveredHeight,
  hiddenBelowFold,
  HOME_INDICATOR_ALLOWANCE_PX,
  INITIAL_LISTICLE_MAP_MODE,
  LISTICLE_MAP_PILL_CLEARANCE,
  LOCKED_SPLIT_VISIBLE_FRACTION,
  sheetHeightPx,
  sheetTopForMode,
  type ListicleMapMode,
  type ViewportHeights,
} from '@/features/articles/components/ListicleMapModes'

/**
 * How close the camera sits on the active stop, per mode.
 *
 * Below the desktop's 17: a phone at street zoom shows one block and one
 * dot, which makes the map look empty and tells the reader nothing about what
 * else is nearby. Close enough, though, that the streets around the stop are
 * legible - a stop framed at neighbourhood scale is not worth centring on.
 * The takeover pulls back slightly because it has the most screen to fill.
 *
 * `list` is never actually used - the camera is paused in that mode - but it
 * is declared so the map is fully described by its mode.
 */
const MODE_ACTIVE_ZOOM: Record<ListicleMapMode, number> = {
  list: 16,
  split: 16,
  map: 15.75,
}
/**
 * A stop crowded by a neighbour a few doors down steps in past its mode's
 * zoom until the two dots part (`activeZoomFor`), up to here: still a block,
 * not a single building.
 */
const MOBILE_MAX_ACTIVE_ZOOM = 17
const MOBILE_FIT_PADDING = 28
/**
 * The overview fits the dots almost exactly. The split slice is a short strip,
 * so the desktop's 1.5-level step back left a 5 km guide as one clump over
 * the whole Lima coast (owner, 2026-11-21).
 */
const MOBILE_OVERVIEW_ZOOM_OUT = 0.2
/** Below the desktop's 13px, so a dense street still reads as separate dots. */
const MOBILE_DOT_SIZE = 10

/**
 * Reads the small and large viewport heights (`svh` / `lvh`). Unlike
 * `innerHeight` they do not change when the browser's toolbars slide in and
 * out, so a `resize` fired by a scroll measures the same numbers again.
 * A browser without the units measures zero and falls back to `innerHeight`.
 */
function measureViewport(): ViewportHeights {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;height:100svh'
  document.body.appendChild(probe)
  const small = probe.offsetHeight || window.innerHeight
  probe.style.height = '100lvh'
  const large = Math.max(probe.offsetHeight || window.innerHeight, small)
  probe.remove()
  return { small, large }
}

/**
 * The phone counterpart to the desktop map column: a full-viewport sheet that
 * slides up behind a floating three-way switch.
 *
 * `list` parks the sheet off screen, `split` shows the map under the copy the
 * reader is scrolling, and `map` is a takeover that covers everything but the
 * navbar.
 * The switch stays put in all three, all the way to the footer (owner,
 * 2026-11-20: it used to slide away once the list had scrolled past), so
 * there is always one visible control saying where you are and how to get
 * back. The body is padded so the footer's last line still clears it. The takeover also floats a card for the active stop, because
 * it is the one mode where the reading column cannot say what a pin is.
 *
 * The switch is the only way to change mode. A drag handle used to sit on the
 * sheet's top edge, which in the takeover is the top of the screen - exactly
 * where a downward drag opens the phone's notification shade instead.
 *
 * The sheet is always the large viewport tall and only its transform
 * changes, so the map never resizes - not between modes, and not when the
 * browser's toolbars come and go as the reader scrolls (ListicleMapModes says
 * why that matters). What that costs is framing: in `split` the map's own
 * centre sits below the fold, so MapPanel is told how much of itself is
 * hidden and aims at the visible slice instead. The camera settles once per
 * mode, not once per scroll.
 */
export function ListicleMapSheet({
  guides,
}: {
  guides?: ListicleMapGuides
}): JSX.Element | null {
  const { points, activeId, scrollToEntry, access } = useListicleMapSync()
  const [mode, setMode] = useState<ListicleMapMode>(INITIAL_LISTICLE_MAP_MODE)
  // The map is mounted the first time the reader asks for it and then kept,
  // so going back and forth never pays for a second billed map load.
  const [hasOpened, setHasOpened] = useState(INITIAL_LISTICLE_MAP_MODE !== 'list')
  const [viewport, setViewport] = useState<ViewportHeights | null>(null)
  // The takeover stops under the navbar, so its height is part of the sheet's
  // geometry. Read from the variable the navbar keeps in sync rather than
  // hard-coding it.
  const [navbarHeight, setNavbarHeight] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)
  // The card and switch cover the bottom of the map, and the card's height
  // depends on whether the stop has a photo and a blurb - so it is measured
  // rather than assumed, and fed back into the camera as hidden space.
  const [overlayHeight, setOverlayHeight] = useState(LISTICLE_MAP_PILL_CLEARANCE)
  const [overlayContentHeight, setOverlayContentHeight] = useState(LISTICLE_MAP_PILL_CLEARANCE - 16)
  useEffect(() => {
    const sync = () => {
      const next = measureViewport()
      // Keep the old object when nothing moved, so a toolbar resize does not
      // re-render the sheet at all.
      setViewport((previous) =>
        previous?.small === next.small && previous.large === next.large
          ? previous
          : next,
      )
      const declared = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--navbar-height'),
      )
      setNavbarHeight(Number.isFinite(declared) ? declared : 0)
    }
    sync()
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
    }
  }, [])

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (mode !== 'list') setHasOpened(true)
  }, [mode])

  /**
   * Split parks an opaque sheet over the bottom of the viewport, and the page
   * cannot scroll out from under it: at maximum scroll the end of the article
   * is still behind the map.
   *
   * The fix is exactly one sheet-height of extra scroll, and it has to come
   * after everything in the document. Inside the article column it only opens
   * a gap of empty background above the footer - the reader scrolls past the
   * end into nothing, which is worse than the bug. Padding the body puts that
   * height below the footer, where the sheet covers it at maximum scroll, so
   * the page stops with its last line resting on the sheet's top edge.
   */
  useEffect(() => {
    if (mode === 'map' || !viewport) return

    const body = document.body
    const previous = body.style.paddingBottom
    // List: the switch stays on screen to the very end (owner, 2026-11-20),
    // so the footer's last line must clear it too.
    body.style.paddingBottom = `${
      mode === 'split'
        ? Math.max(
            coveredHeight('split', viewport),
            access === 'teaser' ? Math.round(viewport.large * LOCKED_SPLIT_VISIBLE_FRACTION) : 0,
          )
        : overlayHeight + 16
    }px`
    return () => {
      body.style.paddingBottom = previous
    }
  }, [mode, viewport, overlayHeight, access])

  const overlayRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const measure = () => {
      setOverlayHeight(node.offsetHeight)
      // Without the home-indicator padding, which changes as the toolbars
      // come and go: the locked picture adds a fixed allowance instead.
      setOverlayContentHeight(
        node.offsetHeight - parseFloat(getComputedStyle(node).paddingBottom || '0'),
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  /**
   * Takeover only: a one-finger horizontal swipe on the map or on the venue
   * card steps to the next or previous stop, the same as the arrows. Two
   * fingers still pan and zoom; taps on pins and the card still work.
   */
  const mapSwipeRef = useRef<HTMLDivElement>(null)
  const cardSwipeRef = useRef<HTMLDivElement>(null)
  const handleSwipe = useCallback(
    (direction: SwipeDirection) => {
      const { previous, next } = adjacentStops(points, activeId)
      const target = direction === 'next' ? next : previous
      if (target) scrollToEntry(target.id)
    },
    [points, activeId, scrollToEntry],
  )
  useOneFingerSwipe(mapSwipeRef, handleSwipe, mode === 'map')
  useOneFingerSwipe(cardSwipeRef, handleSwipe, mode === 'map')

  const handleReturnToEntry = useCallback(() => {
    if (activeId) scrollToEntry(activeId)
    setMode('list')
  }, [activeId, scrollToEntry])

  // Switching between the bottom-hung sheet (locked split/list) and the
  // top-hung takeover changes what its transform is measured from. Start the
  // slide from where the sheet was, so the switch animates instead of jumping.
  const sheetRef = useRef<HTMLDivElement>(null)
  const lastPlacement = useRef<{ anchorBottom: boolean; translateY: number } | null>(null)
  useLayoutEffect(() => {
    const el = sheetRef.current
    if (!el || !viewport) return
    const now = {
      anchorBottom: el.style.bottom === '0px',
      // Where it is going, not where a running slide has it this frame.
      translateY: Number(/translateY\((-?[\d.]+)px\)/.exec(el.style.transform)?.[1] ?? 0),
    }
    const last = lastPlacement.current
    lastPlacement.current = now
    if (!last || last.anchorBottom === now.anchorBottom || reduceMotion) return
    const shift = window.innerHeight - el.offsetHeight
    const startY = last.translateY + (last.anchorBottom ? shift : 0) - (now.anchorBottom ? shift : 0)
    const target = el.style.transform
    const easing = el.style.transition
    el.style.transition = 'none'
    el.style.transform = `translateY(${startY}px)`
    void el.offsetHeight
    el.style.transition = easing
    el.style.transform = target
  })

  if (points.length === 0 || !viewport) return null

  const height = sheetHeightPx(viewport)
  // The locked picture (non-members) cannot follow the toolbars the way a
  // Google map's camera is kept from doing: re-laying it out on every toolbar
  // resize made it jitter while scrolling, and laying it out once for the small
  // viewport left bare paper under it once the toolbars hid (owner,
  // 2026-11-20, iPhone). So in list and split its sheet hangs from the bottom
  // of the screen like the switch does: the browser slides it with the
  // toolbars, its on-screen strip keeps one height, nothing is redrawn. The
  // takeover stays hung from the top, under the navbar, with its picture
  // drawn tall enough for the toolbars-hidden screen.
  const teaser = access === 'teaser'
  const anchorBottom = teaser && mode !== 'map'
  let translateY: number
  let hiddenBelow: number
  if (anchorBottom) {
    const splitOnScreen = Math.round(viewport.large * LOCKED_SPLIT_VISIBLE_FRACTION)
    translateY = mode === 'list' ? height : height - splitOnScreen
    hiddenBelow = translateY
  } else {
    translateY = sheetTopForMode(mode, viewport, navbarHeight)
    hiddenBelow = hiddenBelowFold(mode, viewport, navbarHeight)
  }
  // The locked picture measures the switch without its home-indicator padding
  // plus a fixed allowance for it, so that padding appearing as the toolbars
  // hide never moves its places.
  const coverOverlay = teaser
    ? overlayContentHeight + 16 + HOME_INDICATOR_ALLOWANCE_PX // 16: the switch's own 1rem gap
    : overlayHeight
  const mapInset = hiddenBelow + coverOverlay
  const coveredBottom =
    coverOverlay + (teaser && mode === 'map' ? viewport.large - viewport.small : 0)

  const activeIndex = points.findIndex((point) => point.id === activeId)
  const activePoint = activeIndex >= 0 ? points[activeIndex] : null
  const showMap = mode !== 'list'
  const transition = reduceMotion
    ? 'none'
    : 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1)'

  return (
    <>
      <div
        data-listicle-map-sheet=""
        id="listicle-map-sheet-panel"
        // Page UI stays below the navbar (40) and site dialogs (50).
        ref={sheetRef}
        className={`fixed inset-x-0 z-30 flex flex-col bg-background 1024:hidden ${
          mode === 'split' ? 'border-t-[3px] border-double border-foreground/55' : ''
        }`}
        style={{
          ...(anchorBottom ? { top: 'auto', bottom: 0 } : { top: 0 }),
          height,
          transform: `translateY(${translateY}px)`,
          transition,
        }}
        inert={!showMap}
      >
        <div ref={mapSwipeRef} className="min-h-0 flex-1">
          {hasOpened ? (
            <MapPanel
              viewportInsetBottomPx={mapInset}
              coveredBottomPx={coveredBottom}
              paused={mode === 'list'}
              activeZoom={MODE_ACTIVE_ZOOM[mode]}
              maxActiveZoom={MOBILE_MAX_ACTIVE_ZOOM}
              overviewZoomOut={MOBILE_OVERVIEW_ZOOM_OUT}
              dotSize={MOBILE_DOT_SIZE}
              fitPadding={MOBILE_FIT_PADDING}
              guides={guides}
              // Split keeps the article on screen with its day tabs and its
              // scroll, so the map only adds what the phone cannot otherwise
              // reach: the related guides.
              showArticleControls={mode === 'map'}
              gestureHandling={mode === 'map' ? 'greedy' : 'auto'}
            />
          ) : null}
        </div>
        {/* Where you are, small, in the corner across from More guides
            (owner, 2026-11-21: over the switch it took a whole row of map). */}
        {mode === 'split' && activePoint ? (
          <button
            type="button"
            onClick={handleReturnToEntry}
            aria-label={`Back to ${activePoint.title} in the guide`}
            className="absolute left-3 top-3 z-10 flex h-8 max-w-[calc(100%-11rem)] items-center gap-1.5 rounded-full border border-foreground/15 bg-paper/95 pl-2 pr-2.5 shadow-[0_4px_14px_rgba(26,26,26,0.16)] before:absolute before:-inset-x-1 before:-inset-y-1.5 before:content-['']"
          >
            <MapPin className="size-[13px] shrink-0 text-accent" aria-hidden="true" />
            <span className="min-w-0 truncate text-[12px] font-semibold leading-none text-foreground">
              {activePoint.title}
            </span>
            <span className="shrink-0 text-[10px] font-bold uppercase leading-none tracking-[0.1em] text-foreground/45">
              {activeIndex + 1}/{points.length}
            </span>
            <CornerUpLeft className="size-3 shrink-0 text-foreground/45" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div
        ref={overlayRef}
        data-listicle-map-sheet=""
        data-listicle-map-controls=""
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[35] flex flex-col items-center gap-2.5 px-3 1024:hidden"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <div ref={cardSwipeRef} className="contents">
          {mode === 'map' && activePoint ? (
            <ListicleMapVenueCard
              point={activePoint}
              position={activeIndex + 1}
              total={points.length}
              onOpen={handleReturnToEntry}
            />
          ) : null}
        </div>

        <ListicleMapSwitch mode={mode} onSelect={setMode} />
      </div>
    </>
  )
}
