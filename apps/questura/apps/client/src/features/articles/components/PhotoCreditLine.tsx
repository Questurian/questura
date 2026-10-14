'use client'

import { useId, type JSX } from 'react'
import type { PhotoCredit } from '@/features/articles/lib/photoCredit'

/**
 * The line under an article photo, in the caption's type. A plain photo shows
 * its credit on the right. A composite or edited still says who made it on the
 * left. Several sources read "Sources", and hovering it (or tapping it on a
 * phone) shows their names in a small box. No arrow, no colour change: the
 * line should not pull the reader out of the article.
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
  const listId = useId()

  return (
    <div
      data-photo-credit
      className={`relative flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 font-mono text-[11px] leading-[1.4] ${
        tone === 'dark' ? 'text-white/50' : 'text-foreground/50'
      } ${className}`}
    >
      {credit.createdBy ? <p>Image created by {credit.createdBy}</p> : null}
      {credit.credit ? (
        <p className="ml-auto text-right">{credit.credit}</p>
      ) : (
        <div className="group relative ml-auto shrink-0">
          <button
            type="button"
            aria-describedby={listId}
            // Safari does not focus a tapped button, and focus is what keeps the box open on a phone.
            onClick={(event) => event.currentTarget.focus()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') event.currentTarget.blur()
            }}
            className="cursor-default focus-visible:outline-none"
          >
            Sources
          </button>
          <span
            id={listId}
            role="tooltip"
            className="invisible absolute right-0 top-full z-30 mt-1.5 w-max max-w-[16rem] border border-foreground/15 bg-paper px-2.5 py-2 text-foreground/70 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
          >
            {credit.sources.map((name) => (
              <span key={name} className="block">
                {name}
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  )
}
