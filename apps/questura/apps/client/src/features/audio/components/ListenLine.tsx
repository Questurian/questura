import { listenMinutesLabel, slotElementId, type ArticleAudio } from '../lib/slots'

/**
 * "N-min listen" under the article's title (ADR-0018), in the place the
 * "Add Us On Google" button used to be. Jumps to the first narrated section;
 * it never starts playing on its own. Shown to every reader: the length of
 * what members can listen to is part of what the page sells.
 */
export function ListenLine({ audio }: { audio: ArticleAudio }) {
  const first = audio.clips[0]
  if (!first) return null
  return (
    <a href={`#${slotElementId(first.sectionKey)}`} className="article-listen-line">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
        <path d="M21 15a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z" />
      </svg>
      <span>{listenMinutesLabel(audio.totalSeconds)}</span>
    </a>
  )
}
