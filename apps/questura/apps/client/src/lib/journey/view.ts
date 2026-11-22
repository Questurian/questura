/**
 * One page view being recorded (ADR-0019): seconds on screen and what
 * happened in them. Pure, so node:test covers the clock.
 */

/** With no scroll, tap or key for this long the clock stops: the page is open, nobody is reading. */
export const IDLE_MS = 2 * 60 * 1000
/** A longer gap between ticks is a sleeping phone or a throttled tab, not reading. */
const MAX_TICK_MS = 2000
const MAX_EVENTS = 100
/** The last places are kept for buying steps, so a long scroll cannot crowd them out. */
const ROOM_FOR_STEPS = 20
const STEPS = new Set(['paywall', 'price', 'checkout'])

export type Kind = 'section' | 'paywall' | 'price' | 'tap' | 'map' | 'field' | 'checkout' | 'away'
export type ViewEvent = { t: number; k: Kind; x?: string; d?: number }

export function createView(startedAt: number) {
  const events: ViewEvent[] = []
  const timed = new Map<string, { event: ViewEvent; ms: number }>()
  let visibleMs = 0
  let lastTick = startedAt
  let lastActive = startedAt
  let scroll = 0

  const seconds = () => Math.round(visibleMs / 1000)

  function add(k: Kind, x?: string): ViewEvent | null {
    const limit = STEPS.has(k) ? MAX_EVENTS : MAX_EVENTS - ROOM_FOR_STEPS
    if (events.length >= limit) return null
    const event: ViewEvent = { t: seconds(), k, ...(x ? { x } : {}) }
    events.push(event)
    return event
  }

  return {
    add,
    active(now: number) {
      lastActive = now
    },
    scrolled(percent: number) {
      scroll = Math.max(scroll, Math.min(100, Math.max(0, Math.round(percent))))
    },
    /** Counts the time since the last tick and gives it to whatever was on screen. */
    tick(now: number, visible: boolean, onScreen: ReadonlyArray<{ k: Kind; x: string }> = []): void {
      const ms = Math.max(0, Math.min(MAX_TICK_MS, now - lastTick))
      lastTick = now
      if (!visible || now - lastActive > IDLE_MS) return
      for (const { k, x } of onScreen) {
        const key = `${k}:${x}`
        let entry = timed.get(key)
        if (!entry) {
          const event = add(k, x)
          if (!event) continue
          entry = { event, ms: 0 }
          timed.set(key, entry)
        }
        entry.ms += ms
        entry.event.d = Math.round(entry.ms / 1000)
      }
      visibleMs += ms
    },
    snapshot: () => ({ seconds: seconds(), scroll, events }),
  }
}
