import { articleClip, slotElementId, type ArticleAudio } from '../lib/slots'

/**
 * The article's "Listen" button (ADR-0018, amended 2026-11-19), in the header
 * where "Add Us On Google" used to be. Drawn here as a still shell so it is in
 * place before any JavaScript; the player mounts into the same element and,
 * on a press, opens it into one bar. Shown to every reader: non-members get
 * the membership panel when they press it.
 */
export function ListenLine({ audio, tone = 'light' }: { audio: ArticleAudio; tone?: 'light' | 'dark' }) {
  const clip = articleClip(audio)
  if (!clip) return null
  return (
    <div
      className="audio-slot"
      data-audio-slot={clip.sectionKey}
      data-tone={tone}
      id={slotElementId(clip.sectionKey)}
    >
      <div className="audio-shell" aria-hidden="true">
        <span className="aud-listen">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
          Listen
        </span>
      </div>
    </div>
  )
}
