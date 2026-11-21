'use client'

import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { usePathname } from 'next/navigation'
import { useListicleMapSync } from '@/features/articles/components/ListicleMapSync'
import snapshots from '@/features/articles/data/mapTeasers.json'
import { layoutSnapshot, picturesForBox, type MapSnapshotEntry } from '@/features/articles/lib/mapSnapshot'
import { layoutMapTeaser, type TeaserPoint } from '@/features/articles/lib/mapTeaserLayout'
import { markPhotoReady } from '@/lib/media/photoReady'
import { MapJoinCall as JoinCall } from '@/features/articles/components/MapJoinCall'

const SNAPSHOTS = snapshots as unknown as Record<string, MapSnapshotEntry>

/** Below this much visible height (the phone's split view) the card becomes a bar. */
const COMPACT_BELOW_PX = 460
/** Room the phone's join bar takes across the top of the map, a gap below it included. */
const JOIN_BAR_PX = 72
/** How far the picture may slide down under that bar (its height, less a hair). */
const JOIN_BAR_COVER_PX = 54
/** Room the desktop join card takes at the bottom of the map, margin included. */
const JOIN_CARD_PX = 320

const PAPER_GRID = {
  backgroundImage:
    'linear-gradient(rgb(26 26 26 / 0.045) 1px, transparent 1px), linear-gradient(90deg, rgb(26 26 26 / 0.045) 1px, transparent 1px)',
  backgroundSize: '56px 56px',
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
 * the places and the call to join stay inside what is clear of it.
 * `coveredBottomPx` is the on-screen part of that inset, under the phone's
 * List / Split / Map switch: the picture runs on under the switch to the
 * screen's edge, so the sheet never ends in a band of bare paper.
 * In the phone takeover it also takes in the strip the browser's toolbars give
 * back when they hide, so the picture is drawn once, tall enough for both.
 */
export function MapTeaser({
  insetBottomPx = 0,
  coveredBottomPx = 0,
}: {
  insetBottomPx?: number
  coveredBottomPx?: number
}): JSX.Element {
  const { points, scrollToEntry, teaserKey, teaser } = useListicleMapSync()
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
  // On screen, the switch's strip included: the picture fills this.
  const screenHeight = Math.max(0, size.height - insetBottomPx + Math.min(coveredBottomPx, insetBottomPx))
  const compact = visibleHeight > 0 && visibleHeight < COMPACT_BELOW_PX
  // On the phone (split and the takeover alike) the call to join is the slim
  // bar across the top, so the places below it are never covered (owner,
  // 2026-11-20). The phone sheet always reports its switch; desktop reports 0.
  const barOnTop = compact || coveredBottomPx > 0
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

  // The picture saved on the guide (taken in the studio) first, then the
  // built-in one from data/mapTeasers.json for guides drawn before that.
  const entries = useMemo(
    () => [teaser, teaserKey ? SNAPSHOTS[teaserKey] : undefined].filter((e): e is MapSnapshotEntry => Boolean(e)),
    [teaser, teaserKey],
  )
  // The picture that fits the box with the least zooming, or the other one if
  // the guide's places have moved off it. On a phone's short split view the
  // join bar takes the bottom, and in a locked desktop column the join card
  // does, so the picture slides to keep the places in the strip above it.
  // The picture covers everything on screen, under the switch too; the places
  // still aim at the strip clear of it.
  const view = useMemo(() => {
    const box = { width: size.width, height: screenHeight }
    for (const entry of entries) for (const picture of picturesForBox(entry, box)) {
      // The phone's bar sits at the top of the strip, so the places go
      // between it and the switch, where nothing covers them.
      const focus = barOnTop
        ? { top: JOIN_BAR_PX, bottom: visibleHeight - 10 }
        : picture === entry.tall
          ? { top: 40, bottom: visibleHeight - JOIN_CARD_PX }
          : undefined
      const layout = layoutSnapshot(picture, teaserPoints, box, focus, barOnTop ? JOIN_BAR_COVER_PX : 0)
      if (layout) return { snapshot: picture, layout }
    }
    return null
  }, [entries, teaserPoints, size.width, screenHeight, visibleHeight, barOnTop])
  const snapshot = view?.snapshot
  const snapshotLayout = view?.layout ?? null
  // Nothing is drawn until the box has a size: before that the picture cannot
  // be laid out, and the drawn fallback would flash its dots first.
  const measured = size.width > 0 && size.height > 0
  const awaitingPicture = !measured
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
      data-photo-overlay
      className="absolute z-[2] grid h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent font-[family-name:var(--font-dm-sans)] text-[12px] font-semibold text-background shadow-[0_0_0_3px_var(--background),0_4px_10px_-4px_rgb(26_26_26/0.5)] transition-colors hover:bg-[#3451C7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      style={{ left, top }}
    >
      {number}
    </button>
  )

  return (
    // data-photo-frame: the places and the credit wait for the picture and fade
    // in with it (foundations.css), so no dot ever sits on bare paper.
    <div
      ref={boxRef}
      data-photo-frame
      data-map-surface=""
      className="relative h-full w-full overflow-hidden bg-paper"
      style={snapshotLayout || awaitingPicture ? undefined : PAPER_GRID}
    >
      {snapshot && snapshotLayout ? (
        <div aria-hidden="true" className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: screenHeight > 0 ? screenHeight : '100%' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a fixed, pre-rendered picture with its own two sizes; the markers are laid over it in CSS px */}
          <img
            src={snapshot.srcSmall}
            srcSet={`${snapshot.srcSmall} ${snapshot.width}w, ${snapshot.src} ${snapshot.width * 2}w`}
            sizes={`${Math.round(snapshotLayout.image.width)}px`}
            alt=""
            aria-hidden="true"
            decoding="async"
            data-fade=""
            ref={(image) => { markPhotoReady(image) }}
            onLoad={(event) => markPhotoReady(event.currentTarget)}
            suppressHydrationWarning
            className="absolute max-w-none select-none"
            style={{
              left: snapshotLayout.image.left,
              top: snapshotLayout.image.top,
              width: snapshotLayout.image.width,
              height: snapshotLayout.image.height,
            }}
          />
        </div>
      ) : null}
      <section
        aria-label="Members' map"
        className="absolute inset-x-0 top-0 overflow-hidden"
        style={{ height: visibleHeight > 0 ? visibleHeight : '100%' }}
      >
        {snapshot && snapshotLayout ? (
          <>
            {snapshotLayout.pins.map((pin) =>
              pin.free ? (
                freePin(pin.id, pin.number, pin.x, pin.y)
              ) : (
                <span
                  key={pin.id}
                  aria-hidden="true"
                  data-photo-overlay
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
              data-photo-overlay
              className="absolute right-2 z-[3] font-[family-name:var(--font-dm-sans)] text-[9.5px] text-foreground/55"
              style={{ bottom: 6 }}
            >
              © OpenStreetMap
            </span>
          </>
        ) : awaitingPicture ? null : (
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

        <JoinCall compact={barOnTop} href={href} />
      </section>
    </div>
  )
}
