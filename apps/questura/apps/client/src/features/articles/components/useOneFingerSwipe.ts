'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { classifySwipe, type SwipeDirection } from './ListicleMapSwipe'

/**
 * Claims one-finger drags inside `ref` and reports horizontal swipes.
 *
 * Google's map listens on `document` in the capture phase, so a listener on
 * the container would run too late. These run on `window` in the capture
 * phase, the first stop of every event, and only act on events whose target
 * is inside `ref`:
 * - With one finger down, moves are stopped there (and their default page
 *   scroll cancelled), so the map never sees a one-finger drag and does not
 *   pan. Presses, releases and clicks pass, so taps reach the pins and the
 *   card. (The map runs `gestureHandling: 'greedy'` in the takeover, which
 *   has no "use two fingers" message; see MapPanel.)
 * - A touch that starts in a sideways-scrolling strip is left alone.
 * - The moment a second finger lands the gesture is abandoned and every
 *   event passes through, so two-finger pan and pinch-zoom work as before.
 */
/** True when the touch began in something that scrolls sideways on its own. */
function startsInHorizontalScroller(target: EventTarget | null, root: HTMLElement): boolean {
  let node = target instanceof Element ? target : null
  while (node && node !== root) {
    const overflowX = getComputedStyle(node).overflowX
    if ((overflowX === 'auto' || overflowX === 'scroll') && node.scrollWidth > node.clientWidth) {
      return true
    }
    node = node.parentElement
  }
  return false
}

export function useOneFingerSwipe(
  ref: RefObject<HTMLElement | null>,
  onSwipe: (direction: SwipeDirection) => void,
  enabled: boolean,
): void {
  const onSwipeRef = useRef(onSwipe)
  useEffect(() => {
    onSwipeRef.current = onSwipe
  }, [onSwipe])

  useEffect(() => {
    const node = ref.current
    if (!node || !enabled) return

    let start: { x: number; y: number } | null = null
    let last: { x: number; y: number } | null = null
    // Fingers on the glass, from touch events: they always target the element
    // the touch began on, so the count cannot drift when a finger slides off.
    let fingers = 0

    const onTouchStart = (event: TouchEvent) => {
      fingers = event.touches.length
      // A slider inside the card (tours and tickets) keeps its own swipe.
      if (event.touches.length === 1 && !startsInHorizontalScroller(event.target, node)) {
        const touch = event.touches[0]
        start = { x: touch.clientX, y: touch.clientY }
        last = start
      } else {
        start = null
      }
    }

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1 || !start) return
      const touch = event.touches[0]
      last = { x: touch.clientX, y: touch.clientY }
      event.stopPropagation()
      if (event.cancelable) event.preventDefault()
    }

    const onTouchEnd = (event: TouchEvent) => {
      fingers = event.touches.length
      if (!start || !last || event.touches.length > 0) {
        if (event.touches.length === 0) start = null
        return
      }
      const dx = last.x - start.x
      const dy = last.y - start.y
      start = null
      const direction = classifySwipe(dx, dy)
      if (direction) onSwipeRef.current(direction)
    }

    // Google's map listens to pointer events too; hide one-finger pointer
    // moves the same way, and let them through once a second finger is down.
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' && fingers === 1) event.stopPropagation()
    }

    const inside = (event: Event) => event.target instanceof Node && node.contains(event.target)
    const guard =
      <E extends Event>(handler: (event: E) => void) =>
      (event: E) => {
        if (inside(event)) handler(event)
      }
    const touchStart = guard(onTouchStart)
    const touchMove = guard(onTouchMove)
    const touchEnd = guard(onTouchEnd)
    const pointerMove = guard(onPointerMove)

    const capture = { capture: true }
    const activeCapture = { capture: true, passive: false }
    window.addEventListener('touchstart', touchStart, capture)
    window.addEventListener('touchmove', touchMove, activeCapture)
    window.addEventListener('touchend', touchEnd, capture)
    window.addEventListener('touchcancel', touchEnd, capture)
    window.addEventListener('pointermove', pointerMove, capture)

    return () => {
      window.removeEventListener('touchstart', touchStart, capture)
      window.removeEventListener('touchmove', touchMove, activeCapture)
      window.removeEventListener('touchend', touchEnd, capture)
      window.removeEventListener('touchcancel', touchEnd, capture)
      window.removeEventListener('pointermove', pointerMove, capture)
    }
  }, [ref, enabled])
}
