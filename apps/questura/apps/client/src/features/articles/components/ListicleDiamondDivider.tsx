import type { JSX } from 'react'

/**
 * Splits two places inside a section of a map listicle: a hairline, a small
 * outlined diamond, a hairline, all in the accent blue (owner, 2026-11-16).
 * Lighter than the section heading's double rules, so a new section still
 * reads as the bigger break.
 */
export function ListicleDiamondDivider({ className = '' }: { className?: string }): JSX.Element {
  return (
    <div aria-hidden="true" className={`flex items-center gap-2.5 ${className}`}>
      <div className="h-px flex-1 bg-accent/40" />
      <div className="size-[9px] shrink-0 rotate-45 border-[1.5px] border-accent" />
      <div className="h-px flex-1 bg-accent/40" />
    </div>
  )
}
