'use client'

import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { usePathname } from 'next/navigation'
import Link from '@/components/navigation/PublicLink'
import { useListicleMapSync } from '@/features/articles/components/ListicleMapSync'
import snapshots from '@/features/articles/data/mapTeasers.json'
import { layoutSnapshot, picturesForBox, type MapSnapshotEntry } from '@/features/articles/lib/mapSnapshot'
import { layoutMapTeaser, type TeaserPoint } from '@/features/articles/lib/mapTeaserLayout'

const SNAPSHOTS = snapshots as unknown as Record<string, MapSnapshotEntry>

/** Below this much visible height (the phone's split view) the card becomes a bar. */
const COMPACT_BELOW_PX = 460
/** Room the phone's join bar takes at the bottom of the map, margin included. */
const JOIN_BAR_PX = 76
/** Room the desktop join card takes at the bottom of the map, margin included. */
const JOIN_CARD_PX = 320

const PAPER_GRID = {
  backgroundImage:
    'linear-gradient(rgb(26 26 26 / 0.045) 1px, transparent 1px), linear-gradient(90deg, rgb(26 26 26 / 0.045) 1px, transparent 1px)',
  backgroundSize: '56px 56px',
}

/** The same words as the paywall beside the list (PaywallNotice). */
const UNLOCK = 'Become a member to unlock'
const HEADLINE = 'See every place on the map.'

/** A map pin standing on rings that spread out from where it lands. */
function PinMark({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className={`text-accent ${className}`}>
      <ellipse cx="24" cy="40" rx="20" ry="6" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.28" />
      <ellipse cx="24" cy="40" rx="13" ry="4" fill="none" stroke="currentColor" strokeWidth="1.75" opacity="0.5" />
      <ellipse cx="24" cy="40" rx="6.5" ry="2" fill="currentColor" opacity="0.7" />
      <path d="M24 40C24 40 13 27.5 13 17.5a11 11 0 1 1 22 0C35 27.5 24 40 24 40Z" fill="currentColor" />
      <circle cx="24" cy="17.5" r="4.2" className="fill-background" />
    </svg>
  )
}

/**
 * The way in, as plain as the paywall beside the list (owner decision,
 * 2026-10-19): no count of places -- a short list should not look short --
 * and nothing to read but the offer. A card on desktop; a bar on the phone's
 * split view, where the places have to stay in sight above it.
 */
function JoinCall({ compact, href }: { compact: boolean; href: string }) {
  if (compact) {
    return (
      <div className="absolute inset-x-2.5 bottom-2.5 z-[4] flex items-center gap-2.5 border border-foreground/10 bg-background px-3.5 py-2.5 text-foreground shadow-[0_12px_30px_-18px_rgb(26_26_26/0.5)]">
        <PinMark className="h-8 w-8 shrink-0" />
        <h2 className="min-w-0 flex-1 text-balance font-display text-[1rem] font-medium leading-tight">{HEADLINE}</h2>
        <Link
          href={href}
          className="inline-flex min-h-[38px] shrink-0 items-center rounded-sm bg-accent px-3.5 font-[family-name:var(--font-dm-sans)] text-[0.84rem] font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          Become a member
        </Link>
      </div>
    )
  }

  return (
    <div className="absolute bottom-10 left-1/2 z-[4] w-[min(400px,calc(100%-40px))] -translate-x-1/2 border border-foreground/10 bg-background px-7 pb-5 pt-5 text-center text-foreground shadow-[0_18px_44px_-24px_rgb(26_26_26/0.45)]">
      <PinMark className="mx-auto mb-2.5 h-12 w-12" />
      <h2 className="text-balance font-display text-[1.5rem] font-medium leading-[1.15] tracking-[-0.015em]">{HEADLINE}</h2>
      <Link
        href={href}
        className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-sm bg-accent px-6 font-[family-name:var(--font-dm-sans)] text-[15px] font-semibold tracking-[0.01em] text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        {UNLOCK}
      </Link>
      <p className="mt-3.5 font-[family-name:var(--font-dm-sans)] text-[13px] leading-relaxed text-foreground/80">
        Already a member?{' '}
        <Link href={href} className="font-semibold text-accent underline underline-offset-4 hover:text-foreground">
          Sign in
        </Link>
      </p>
    </div>
  )
}

/**
 * What a non-member sees where a guide's map would be (owner decisions,
 * 2026-10-19): never a Google map, which is billed per load.
 *
 * - The guide's saved map picture (an OpenStreetMap render, lib/mapSnapshot.ts)
 *   with a blue marker per place and the way in. Free to show however often a
 *   locked page is loaded.
 * - A drawing of the list -- neighborhoods by name, a pin per place -- for a
 *   guide with no picture yet, or whose places have moved off its picture.
 *
 * Locked places come from the server already rough (freeSample.ts). A place
 * the reader can open is a numbered pin that takes them to its entry. The
 * related-guides menu is not offered here: a non-member's guides are locked.
 *
 * `insetBottomPx` is how much of the map the phone sheet hides at the bottom;
 * the map and its call to join stay inside what is on screen.
 */
export function MapTeaser({ insetBottomPx = 0 }: { insetBottomPx?: number }): JSX.Element {
  const { points, scrollToEntry, teaserKey } = useListicleMapSync()
  const pathname = usePathname()
  const boxRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const measure = () => setSize({ width: box.clientWidth, height: box.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  const visibleHeight = Math.max(0, size.height - insetBottomPx)
  const compact = visibleHeight > 0 && visibleHeight < COMPACT_BELOW_PX
  const href = `/join?returnTo=${encodeURIComponent(pathname || '/')}`

  const teaserPoints = useMemo<TeaserPoint[]>(
    () =>
      points.map((point) => ({
        id: point.id,
        lat: point.lat,
        lng: point.lng,
        inert: Boolean(point.inert),
        number: point.inert ? null : point.index + 1,
        area: point.area ?? null,
      })),
    [points],
  )

  const entry = teaserKey ? SNAPSHOTS[teaserKey] : undefined
  // The picture that fits the box with the least zooming, or the other one if
  // the guide's places have moved off it. On a phone's short split view the
  // join bar takes the bottom, and in a locked desktop column the join card
  // does, so the picture slides to keep the places in the strip above it.
  const view = useMemo(() => {
    if (!entry) return null
    const box = { width: size.width, height: visibleHeight }
    for (const picture of picturesForBox(entry, box)) {
      const focus = compact
        ? { top: 16, bottom: visibleHeight - JOIN_BAR_PX - 8 }
        : picture === entry.tall
          ? { top: 40, bottom: visibleHeight - JOIN_CARD_PX }
          : undefined
      const layout = layoutSnapshot(picture, teaserPoints, box, focus)
      if (layout) return { snapshot: picture, layout }
    }
    return null
  }, [entry, teaserPoints, size.width, visibleHeight, compact])
  const snapshot = view?.snapshot
  const snapshotLayout = view?.layout ?? null
  const drawing = useMemo(
    () => (snapshotLayout ? null : layoutMapTeaser(teaserPoints, { width: size.width, height: visibleHeight, compact })),
    [snapshotLayout, teaserPoints, size.width, visibleHeight, compact],
  )

  const freePin = (id: string, number: number | null, left: number | string, top: number | string) => (
    <button
      key={id}
      type="button"
      onClick={() => scrollToEntry(id)}
      aria-label={`Go to place ${number} in the list`}
      className="absolute z-[2] grid h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent font-[family-name:var(--font-dm-sans)] text-[12px] font-semibold text-background shadow-[0_0_0_3px_var(--background),0_4px_10px_-4px_rgb(26_26_26/0.5)] transition-colors hover:bg-[#3451C7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      style={{ left, top }}
    >
      {number}
    </button>
  )

  return (
    <div ref={boxRef} className="relative h-full w-full overflow-hidden bg-paper" style={snapshotLayout ? undefined : PAPER_GRID}>
      <section
        aria-label="Members' map"
        className="absolute inset-x-0 top-0 overflow-hidden"
        style={{ height: visibleHeight > 0 ? visibleHeight : '100%' }}
      >
        {snapshot && snapshotLayout ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- a fixed, pre-rendered picture with its own two sizes; the markers are laid over it in CSS px */}
            <img
              src={snapshot.srcSmall}
              srcSet={`${snapshot.srcSmall} ${snapshot.width}w, ${snapshot.src} ${snapshot.width * 2}w`}
              sizes={`${Math.round(snapshotLayout.image.width)}px`}
              alt=""
              aria-hidden="true"
              decoding="async"
              className="absolute max-w-none select-none"
              style={{
                left: snapshotLayout.image.left,
                top: snapshotLayout.image.top,
                width: snapshotLayout.image.width,
                height: snapshotLayout.image.height,
              }}
            />
            {snapshotLayout.pins.map((pin) =>
              pin.free ? (
                freePin(pin.id, pin.number, pin.x, pin.y)
              ) : (
                <span
                  key={pin.id}
                  aria-hidden="true"
                  className={`absolute z-[1] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ${
                    compact
                      ? 'h-[11px] w-[11px] shadow-[0_0_0_2px_var(--background),0_2px_5px_rgb(26_26_26/0.25)]'
                      : 'h-[15px] w-[15px] shadow-[0_0_0_3px_var(--background),0_2px_6px_rgb(26_26_26/0.25)]'
                  }`}
                  style={{ left: pin.x, top: pin.y }}
                />
              ),
            )}
            {/* OpenStreetMap's licence asks for this credit wherever its map is shown. */}
            <span
              className="absolute right-2 z-[3] font-[family-name:var(--font-dm-sans)] text-[9.5px] text-foreground/55"
              style={{ bottom: compact ? JOIN_BAR_PX : 6 }}
            >
              © OpenStreetMap
            </span>
          </>
        ) : (
          <>
            <svg
              aria-hidden="true"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full fill-none stroke-foreground/10 [stroke-dasharray:3_5] [stroke-width:1]"
            >
              <path d="M-5 78 C 18 70, 22 52, 38 46 S 55 30, 70 22 S 92 8, 110 4" vectorEffect="non-scaling-stroke" />
              <path d="M-5 92 C 20 84, 34 70, 48 64 S 72 50, 110 40" vectorEffect="non-scaling-stroke" />
              <path d="M8 -5 C 14 20, 30 34, 28 60 S 40 90, 36 110" vectorEffect="non-scaling-stroke" />
              <path d="M62 -5 C 58 18, 70 30, 66 52 S 78 82, 74 110" vectorEffect="non-scaling-stroke" />
            </svg>
            {drawing?.labels.map((label) => (
              <span
                key={label.text}
                aria-hidden="true"
                className={`absolute whitespace-nowrap font-mono uppercase tracking-[0.2em] ${
                  label.big ? 'text-[12.5px] font-semibold text-foreground/60' : 'text-[10.5px] font-semibold text-foreground/45'
                } ${label.side === 'left' ? '-translate-x-full -translate-y-1/2' : '-translate-y-1/2'}`}
                style={{ left: `${label.x}%`, top: `${label.y}%` }}
              >
                {label.text}
              </span>
            ))}
            {drawing?.pins.map((pin) =>
              pin.free ? (
                freePin(pin.id, pin.number, `${pin.x}%`, `${pin.y}%`)
              ) : (
                <span
                  key={pin.id}
                  aria-hidden="true"
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/70 ${
                    compact ? 'h-[10px] w-[10px] shadow-[0_0_0_2px_var(--paper)]' : 'h-[14px] w-[14px] shadow-[0_0_0_3px_var(--paper)]'
                  }`}
                  style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                />
              ),
            )}
          </>
        )}

        <JoinCall compact={compact} href={href} />
      </section>
    </div>
  )
}
