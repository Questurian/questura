'use client'

import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { usePathname } from 'next/navigation'
import Link from '@/components/navigation/PublicLink'
import {
  ListicleMapGuidesMenu,
  type ListicleMapGuides,
} from '@/features/articles/components/ListicleMapGuidesMenu'
import { useListicleMapSync } from '@/features/articles/components/ListicleMapSync'
import snapshots from '@/features/articles/data/mapTeasers.json'
import { layoutSnapshot, type MapSnapshot } from '@/features/articles/lib/mapSnapshot'
import {
  layoutMapTeaser,
  teaserAreaLine,
  type TeaserPoint,
} from '@/features/articles/lib/mapTeaserLayout'

const SNAPSHOTS = snapshots as unknown as Record<string, MapSnapshot>

const LOCK_ICON = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="9" rx="1.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
)

/** Below this much visible height (the phone's split view) the drawing loses its names and the call shrinks. */
const COMPACT_BELOW_PX = 460

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
 * the reader can open is a numbered pin that takes them to its entry.
 *
 * `insetBottomPx` is how much of the map the phone sheet hides at the bottom;
 * the map and its call to join stay inside what is on screen.
 */
export function MapTeaser({
  insetBottomPx = 0,
  guides,
}: {
  insetBottomPx?: number
  guides?: ListicleMapGuides
}): JSX.Element {
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
  const { pins, labels } = useMemo(
    () => layoutMapTeaser(teaserPoints, { width: size.width, height: visibleHeight, compact }),
    [teaserPoints, size.width, visibleHeight, compact],
  )

  const total = teaserPoints.length
  const free = teaserPoints.filter((point) => !point.inert).length
  const membersOnly = total - free
  const areaLine = compact ? teaserAreaLine(teaserPoints) : null
  const href = `/join?returnTo=${encodeURIComponent(pathname || '/')}`
  const title = total === 1 ? 'See where it is.' : `See where all ${total} places are.`
  const pitch =
    free > 0
      ? `Read the first ${free} free. Members get every pin, and a map that zooms right down to the street.`
      : 'Members get every pin, and a map that zooms right down to the street.'

  const snapshot = teaserKey ? SNAPSHOTS[teaserKey] : undefined
  // On a phone's short split view the join bar takes the bottom, so the
  // picture slides to keep the places in the strip between the legend and it.
  const snapshotLayout = useMemo(
    () =>
      snapshot
        ? layoutSnapshot(
            snapshot,
            teaserPoints,
            { width: size.width, height: visibleHeight },
            compact ? { top: 48, bottom: visibleHeight - 84 } : undefined,
          )
        : null,
    [snapshot, teaserPoints, size.width, visibleHeight, compact],
  )

  if (snapshot && snapshotLayout) {
    const { image } = snapshotLayout
    return (
      <div ref={boxRef} className="relative h-full w-full overflow-hidden bg-paper">
        <section
          aria-label="Members' map"
          className="absolute inset-x-0 top-0 overflow-hidden"
          style={{ height: visibleHeight > 0 ? visibleHeight : '100%' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a fixed, pre-rendered picture with its own two sizes; the markers are laid over it in CSS px */}
          <img
            src={snapshot.srcSmall}
            srcSet={`${snapshot.srcSmall} ${snapshot.width}w, ${snapshot.src} ${snapshot.width * 2}w`}
            sizes={`${Math.round(image.width)}px`}
            alt=""
            aria-hidden="true"
            decoding="async"
            className="absolute max-w-none select-none"
            style={{ left: image.left, top: image.top, width: image.width, height: image.height }}
          />

          {snapshotLayout.pins.map((pin) =>
            pin.free ? (
              <button
                key={pin.id}
                type="button"
                onClick={() => scrollToEntry(pin.id)}
                aria-label={`Go to place ${pin.number} in the list`}
                className="absolute z-[2] grid h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent font-[family-name:var(--font-dm-sans)] text-[12px] font-semibold text-background shadow-[0_0_0_3px_var(--background),0_4px_10px_-4px_rgb(26_26_26/0.5)] transition-colors hover:bg-[#3451C7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                style={{ left: pin.x, top: pin.y }}
              >
                {pin.number}
              </button>
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

          <p className="absolute left-3.5 top-3 z-[3] flex items-center gap-3 rounded-full bg-background/90 px-2.5 py-1.5 font-[family-name:var(--font-dm-sans)] text-[11.5px] font-medium text-foreground/75">
            {free > 0 ? (
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-[9px] w-[9px] rounded-full bg-accent" />
                {free} free
              </span>
            ) : null}
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-[9px] w-[9px] rounded-full bg-accent" />
              {membersOnly} for members
            </span>
          </p>

          {compact ? (
            // The phone's split view has room for a bar, not a card: the
            // places stay in sight above it. Sign in is in the navbar.
            <div className="absolute inset-x-2.5 bottom-2.5 z-[4] flex items-center gap-3 border border-foreground/10 bg-background px-3.5 py-2.5 text-foreground shadow-[0_12px_30px_-18px_rgb(26_26_26/0.5)]">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-[1.02rem] font-medium leading-tight">
                  {total === 1 ? 'See where it is.' : `See all ${total} places.`}
                </h2>
                <p className="mt-0.5 font-[family-name:var(--font-dm-sans)] text-[0.74rem] text-foreground/70">
                  Members get every pin.
                </p>
              </div>
              <Link
                href={href}
                className="inline-flex min-h-[38px] shrink-0 items-center rounded-[4px] bg-accent px-3.5 font-[family-name:var(--font-dm-sans)] text-[0.84rem] font-semibold text-background transition-colors hover:bg-[#3451C7] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                Become a member
              </Link>
            </div>
          ) : (
            <div className="absolute bottom-10 left-1/2 z-[4] w-[min(440px,calc(100%-40px))] -translate-x-1/2 border border-foreground/10 bg-background px-[26px] pb-5 pt-[22px] text-center text-foreground shadow-[0_18px_44px_-24px_rgb(26_26_26/0.45)]">
              <span aria-hidden="true" className="inline-grid h-10 w-10 place-items-center rounded-full bg-accent/10 text-[#3451C7]">
                {LOCK_ICON}
              </span>
              <p className="mt-2.5 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-[#3451C7]">
                The members&apos; map
              </p>
              <h2 className="mt-2 text-balance font-display text-[1.75rem] font-medium leading-[1.12]">{title}</h2>
              <p className="mx-auto mt-2 max-w-[36ch] font-display text-[0.97rem] leading-[1.55] text-foreground/80">{pitch}</p>
              <div className="mt-4 flex items-center justify-center gap-4">
                <Link
                  href={href}
                  className="inline-flex min-h-11 items-center rounded-[4px] bg-accent px-6 font-[family-name:var(--font-dm-sans)] text-[0.9rem] font-semibold text-background transition-colors hover:bg-[#3451C7] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                >
                  Become a member
                </Link>
                <Link
                  href={href}
                  className="font-[family-name:var(--font-dm-sans)] text-[0.85rem] font-medium text-foreground underline underline-offset-[3px] hover:text-accent"
                >
                  Sign in
                </Link>
              </div>
            </div>
          )}

          {/* OpenStreetMap's licence asks for this credit wherever its map is shown. */}
          <span
            className={`absolute right-2 z-[3] font-[family-name:var(--font-dm-sans)] text-[9.5px] text-foreground/55 ${
              compact ? 'bottom-[76px]' : 'bottom-1.5'
            }`}
          >
            © OpenStreetMap
          </span>
        </section>

        {guides && guides.articles.length > 0 ? (
          <div className="pointer-events-none absolute right-3 top-3 z-10">
            <ListicleMapGuidesMenu {...guides} compact />
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div ref={boxRef} className="relative h-full w-full overflow-hidden bg-paper" style={PAPER_GRID}>
      <section
        aria-label="Members' map"
        className="absolute inset-x-0 top-0"
        style={{ height: visibleHeight > 0 ? visibleHeight : '100%' }}
      >
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

        {labels.map((label) => (
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

        {pins.map((pin) =>
          pin.free ? (
            <button
              key={pin.id}
              type="button"
              onClick={() => scrollToEntry(pin.id)}
              aria-label={`Go to place ${pin.number} in the list`}
              className="absolute z-[2] grid h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent font-[family-name:var(--font-dm-sans)] text-[12px] font-semibold text-background shadow-[0_4px_10px_-4px_rgb(26_26_26/0.5)] transition-colors hover:bg-[#3451C7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            >
              {pin.number}
            </button>
          ) : (
            <span
              key={pin.id}
              aria-hidden="true"
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/20 ${
                compact ? 'h-[10px] w-[10px] shadow-[0_0_0_2px_var(--paper)]' : 'h-[14px] w-[14px] shadow-[0_0_0_3px_var(--paper)]'
              }`}
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            />
          ),
        )}

        <p className="absolute left-4 top-3.5 z-[3] flex gap-3.5 font-[family-name:var(--font-dm-sans)] text-[11px] font-medium text-foreground/65">
          {free > 0 ? (
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-[9px] w-[9px] rounded-full bg-accent" />
              {free} free
            </span>
          ) : null}
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-[9px] w-[9px] rounded-full bg-foreground/25" />
            {membersOnly} for members
          </span>
        </p>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[4]"
          style={{
            background: compact
              ? 'linear-gradient(180deg, transparent 30%, rgb(239 233 222 / 0.9) 44%, var(--paper) 52%)'
              : 'linear-gradient(180deg, transparent 46%, rgb(239 233 222 / 0.88) 62%, var(--paper) 74%)',
          }}
        />

        <div
          className={`absolute inset-x-0 z-[5] text-center text-foreground ${
            compact ? 'bottom-3.5 px-5' : 'bottom-[6%] px-7'
          }`}
        >
          {compact ? null : (
            <span aria-hidden="true" className="inline-grid h-11 w-11 place-items-center rounded-full bg-accent/10 text-[#3451C7]">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="9" rx="1.5" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            </span>
          )}
          <p className={`font-mono text-[0.64rem] uppercase tracking-[0.2em] text-[#3451C7] ${compact ? '' : 'mt-3.5'}`}>
            The members&apos; map
          </p>
          <h2
            className={`mx-auto max-w-[22ch] text-balance font-display font-medium tracking-[-0.01em] ${
              compact ? 'mt-1.5 text-[1.35rem] leading-[1.15]' : 'mt-2.5 text-[2rem] leading-[1.12]'
            }`}
          >
            {title}
          </h2>
          <p
            className={`mx-auto max-w-[40ch] font-display text-foreground/80 ${
              compact ? 'mt-1.5 text-[0.86rem] leading-[1.45]' : 'mt-2.5 text-[1rem] leading-[1.6]'
            }`}
          >
            {areaLine ?? pitch}
          </p>
          <div className={`flex items-center justify-center gap-[18px] ${compact ? 'mt-3' : 'mt-5'}`}>
            <Link
              href={href}
              className={`inline-flex items-center rounded-[4px] bg-accent font-[family-name:var(--font-dm-sans)] text-[0.9rem] font-semibold text-background transition-colors hover:bg-[#3451C7] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
                compact ? 'min-h-10 px-5' : 'min-h-[46px] px-[26px]'
              }`}
            >
              Become a member
            </Link>
            <Link
              href={href}
              className="font-[family-name:var(--font-dm-sans)] text-[0.85rem] font-medium text-foreground underline underline-offset-[3px] hover:text-accent"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {guides && guides.articles.length > 0 ? (
        <div className="pointer-events-none absolute right-3 top-3 z-10">
          <ListicleMapGuidesMenu {...guides} compact />
        </div>
      ) : null}
    </div>
  )
}
