import type { JSX } from 'react'

/**
 * The words inside a card's kicker (the blue type label above a title).
 *
 * A Questurian Map reads "Maps" with a pin in front, so a reader knows the
 * card opens an interactive map. The server sends "Maps"; "Questurian Maps"
 * is the old label and still arrives from cached pages, so it is mapped here.
 * The pin is `currentColor`, so it takes the kicker's own colour (blue on
 * the paper blocks, the soft blue on the dark ones). It is one cap tall and
 * sits on the baseline (`.kicker-pin` in block-type.css).
 */
export const MAPS_LABEL = 'Maps'

export function normalizeArticleTypeLabel(label: string): string {
  return label.trim().toLowerCase() === 'questurian maps' ? MAPS_LABEL : label
}

export function ArticleKickerLabel({ label }: { label: string }): JSX.Element {
  const text = normalizeArticleTypeLabel(label)
  if (text !== MAPS_LABEL) return <>{text}</>

  return (
    <span className="whitespace-nowrap">
      <svg
        aria-hidden="true"
        viewBox="0 0 12 16"
        className="kicker-pin"
        fill="currentColor"
      >
        <path d="M6 0C2.69 0 0 2.6 0 5.82 0 10.18 6 16 6 16s6-5.82 6-10.18C12 2.6 9.31 0 6 0Zm0 8.2a2.3 2.3 0 1 1 0-4.6 2.3 2.3 0 0 1 0 4.6Z" />
      </svg>
      {text}
    </span>
  )
}
