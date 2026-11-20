import { articleClip, listenMinutesLabel, slotElementId, type ArticleAudio } from '../lib/slots'

/**
 * The article's "Listen" line (ADR-0018, amended 2026-11-19), directly above
 * the article's text in every layout. Drawn here as a still shell so it is in
 * place before any JavaScript; the player mounts into the same element and,
 * on a press, opens it into the player row. Shown to every reader: non-members
 * get the membership panel when they press it.
 */
export function ListenLine({ audio }: { audio: ArticleAudio }) {
  const clip = articleClip(audio)
  if (!clip) return null
  return (
    <div className="audio-slot" data-audio-slot={clip.sectionKey} id={slotElementId(clip.sectionKey)}>
      <div className="audio-shell" aria-hidden="true">
        <span className="aud-listen">
          <span className="aud-listen-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M9 6.5v11l9-5.5z" />
            </svg>
          </span>
          <span className="aud-listen-word">Listen</span>
          <span className="aud-listen-length">{listenMinutesLabel(clip.durationSeconds)}</span>
        </span>
      </div>
    </div>
  )
}

