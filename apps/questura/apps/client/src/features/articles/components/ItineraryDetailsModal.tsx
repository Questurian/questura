'use client'

import type { JSX, ReactNode } from 'react'
import { useCallback, useEffect, useId, useState } from 'react'
import { X } from 'lucide-react'

const triggerLinkClass =
  'maps-listicle-info-label break-words text-left text-[12px] font-light leading-tight text-foreground/72 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none 480:text-[13px] sm:text-[14px]'

/**
 * The "Show Amenities and Details" sheet shared by nightlife and stays (owner,
 * 2026-11-20). One frame for both: blue mono kicker, serif name, a grey line
 * under it, square corners on the page ground, sections split by hairlines
 * and opened by a small blue label, the place in the footer. The body is the
 * caller's: stays list label/value rows (`DetailsRows`), nightlife a strip of
 * scales over a two-column grid (`DetailsGrid`).
 */
export function ItineraryDetailsModal({
  kicker,
  venueTitle,
  subtitle,
  footer,
  children,
}: {
  kicker: string
  venueTitle: string
  subtitle?: string
  footer?: string
  /** Rendered only while open, so it may read the clock. */
  children: () => ReactNode
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const dialogId = useId()

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return

    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, close])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerLinkClass}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
      >
        Show Amenities and Details
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close"
            onClick={close}
          />
          <div
            id={dialogId}
            className="relative z-[101] flex max-h-[88dvh] w-full max-w-[420px] flex-col bg-background text-foreground shadow-[0_18px_50px_rgb(0_0_0/0.18)] sm:max-h-[85vh]"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-5">
              <div className="min-w-0">
                <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                  {kicker}
                </p>
                <h2
                  id={titleId}
                  className="font-display text-[22px] font-semibold leading-[1.15]"
                >
                  {venueTitle}
                </h2>
                {subtitle ? (
                  <p className="mt-1 text-[12.5px] text-foreground/55">{subtitle}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={close}
                className="-mr-1 shrink-0 p-1 text-foreground/50 transition-colors hover:text-foreground"
                aria-label={`Close ${kicker.toLowerCase()}`}
              >
                <X className="size-5" strokeWidth={1.75} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children()}</div>
            {footer ? (
              <p className="shrink-0 border-t border-foreground/10 px-5 pb-4 pt-3 text-[11px] text-foreground/55">
                {footer}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}

/** A hairline-topped block opened by the small blue label. */
export function DetailsSection({
  label,
  children,
}: {
  label?: string
  children: ReactNode
}): JSX.Element {
  return (
    <section className="border-t border-foreground/10 px-5 py-3.5">
      {label ? (
        <h3 className="mb-2.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-accent">
          {label}
        </h3>
      ) : null}
      {children}
    </section>
  )
}

export type DetailsItem = { key: string; label: string; value: string }

/** Label left, value right, one column each (stays). */
export function DetailsRows({ items }: { items: DetailsItem[] }): JSX.Element {
  return (
    <dl className="m-0 grid grid-cols-[minmax(0,9.5em)_1fr] gap-x-4 gap-y-[7px] text-[13px] leading-[1.4]">
      {items.map((item) => (
        <div key={item.key} className="contents">
          <dt className="text-foreground/55">{item.label}</dt>
          <dd className="m-0 tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Label over value in two columns; long values take the full width (nightlife). */
export function DetailsGrid({ items }: { items: DetailsItem[] }): JSX.Element {
  return (
    <dl className="m-0 grid grid-flow-row-dense grid-cols-2 gap-x-5 gap-y-3">
      {items.map((item) => (
        <div
          key={item.key}
          className={item.value.length > 26 ? 'col-span-2 min-w-0' : 'min-w-0'}
        >
          <dt className="mb-0.5 text-[11px] text-foreground/55">{item.label}</dt>
          <dd className="m-0 text-[13px] leading-[1.4]">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
