'use client'

import { useCallback, useId, useRef, useState, type JSX } from 'react'
import { ChevronDown } from 'lucide-react'
import type { PhotoCredit, PhotoCreditGroup } from '@/features/articles/lib/photoCredit'
import { useMenuDismiss } from '@/features/articles/lib/useMenuDismiss'

function SourceGroup({ group }: { group: PhotoCreditGroup }): JSX.Element {
  return (
    <div className="border-t border-foreground/12 pt-3 first:border-t-0 first:pt-0">
      {group.heading ? (
        <p className="mb-2 font-[family-name:var(--font-dm-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/55">
          {group.heading}
        </p>
      ) : null}
      <ul className="space-y-2.5">
        {group.sources.map((source, index) => (
          <li key={`${source.credit}-${index}`}>
            {source.position ? (
              <span className="block font-mono text-[10px] leading-[1.5] text-foreground/50">{source.position}</span>
            ) : null}
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
              >
                {source.credit}
              </a>
            ) : (
              <span>{source.credit}</span>
            )}
            {source.title ? (
              <span className="block text-[12px] leading-snug text-foreground/60">{source.title}</span>
            ) : null}
          </li>
        ))}
      </ul>
      {group.editCredit ? (
        <p className="mt-2.5 text-[12px] leading-snug text-foreground/60">
          Composite / edit: <span className="text-foreground">{group.editCredit}</span>
        </p>
      ) : null}
    </div>
  )
}

/**
 * The line under an article photo: the credit holder on the left, a Source
 * button on the right. A click (never a hover) opens a small popover listing
 * every original behind the image, so a composite or an edited still names
 * each photographer. Outside presses and Escape close it.
 */
export function PhotoCreditLine({
  credit,
  tone = 'light',
  className = '',
}: {
  credit: PhotoCredit
  /** `dark` for a photo set on the ink header band. */
  tone?: 'light' | 'dark'
  className?: string
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverId = useId()
  const close = useCallback(() => {
    // Escape from a link inside the popover would otherwise drop focus to the page.
    if (rootRef.current?.contains(document.activeElement)) buttonRef.current?.focus()
    setOpen(false)
  }, [])
  useMenuDismiss(open, close, rootRef)

  const dark = tone === 'dark'
  const sourceCount = credit.groups.reduce((total, group) => total + group.sources.length, 0)

  return (
    <div
      ref={rootRef}
      data-photo-credit
      className={`relative flex items-baseline justify-between gap-4 font-mono text-[11px] leading-[1.4] ${
        dark ? 'text-white/50' : 'text-foreground/50'
      } ${className}`}
    >
      <p className="min-w-0 truncate">{credit.holder}</p>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={`-my-2 inline-flex shrink-0 items-center gap-1 py-2 transition-colors focus-visible:outline-none focus-visible:underline ${
          dark ? 'hover:text-white aria-expanded:text-white' : 'hover:text-accent aria-expanded:text-accent'
        }`}
      >
        Source
        <ChevronDown
          className={`size-3 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.8}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          id={popoverId}
          role="region"
          aria-label="Photo sources"
          className="absolute right-0 top-full z-30 mt-2 max-h-[min(24rem,60vh)] w-[min(19rem,calc(100vw-2rem))] space-y-3 overflow-y-auto border border-foreground/15 bg-paper px-4 py-3.5 text-left font-sans text-[13px] leading-snug text-foreground shadow-[0_12px_28px_-14px_rgba(26,26,26,0.45)]"
        >
          <p className="font-[family-name:var(--font-dm-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
            {sourceCount === 1 ? 'Photo source' : 'Photo sources'}
          </p>
          <div className="space-y-3">
            {credit.groups.map((group, index) => (
              <SourceGroup key={group.heading ?? index} group={group} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
