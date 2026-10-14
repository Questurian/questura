import type { JSX } from 'react'

import type { SectionKey } from './lib/sectionPages'

/**
 * One line icon per section page, drawn on a 24px grid at a 1.5 stroke so it
 * reads as the same hand as the navbar's icons. `currentColor`, so the page
 * decides the colour (the accent blue in the masthead).
 */
const PATHS: Record<SectionKey, JSX.Element> = {
  // Fork and knife.
  eat: (
    <>
      <path d="M7 3v8m-2.5-8v5a2.5 2.5 0 0 0 5 0V3M7 11v10" />
      <path d="M17 21V3c-2.2 1.4-3.5 4-3.5 7v3.5H17" />
    </>
  ),
  // Bed.
  stay: (
    <>
      <path d="M3 5v14m0-4h18v4m0-4v-3a3 3 0 0 0-3-3h-8v6" />
      <circle cx="6.5" cy="10.5" r="2" />
    </>
  ),
  // A route between two stops.
  itineraries: (
    <>
      <circle cx="6" cy="5.5" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="M6 8v3.5a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3V16" />
    </>
  ),
  // Envelope.
  newsletters: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="1" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </>
  ),
}

export function SectionIcon({ section, className = '' }: { section: SectionKey; className?: string }): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[section]}
    </svg>
  )
}
