/**
 * The Audio badge on an article card's photo (ADR-0018): the article has
 * AudioClips. Shown to every reader, the same on every kind of card (owner's
 * pick 2026-11-20: black box, big glowing blue headphones, "Audio"). The
 * photo's wrapper must be positioned (`relative`); the badge sits bottom-left
 * above the card's link layer. It waits for the photo (data-photo-overlay,
 * foundations.css), so it never sits on an empty frame.
 */
export function AudioBadge() {
  return (
    <span className="audio-badge" aria-label="Has audio" data-photo-overlay>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
        <path
          d="M21 15a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z"
          fill="currentColor"
        />
      </svg>
      Audio
    </span>
  )
}
