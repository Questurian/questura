/**
 * The article's audio slot (ADR-0018, amended 2026-11-19): where its one
 * player sits on the page, in the header where the "N-min listen" line was.
 *
 * The server draws the collapsed "Listen" button as a still shell, so the
 * page has its look before any JavaScript runs. The real player, loaded only
 * on articles that have audio, mounts into the same element.
 */

/** A standard article has one recording, read from title to last line. */
export const ARTICLE_SECTION_KEY = 'article'

export type ArticleAudioClip = {
  id: number
  sectionKey: string
  title: string
  durationSeconds: number
  voiceName: string
}

export type ArticleAudio = {
  clips: ArticleAudioClip[]
  totalSeconds: number
}

export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds || 0))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

export function slotElementId(sectionKey: string): string {
  return `listen-${sectionKey}`
}

/** The one recording a standard article plays. */
export function articleClip(audio: ArticleAudio | null | undefined): ArticleAudioClip | null {
  return audio?.clips.find((clip) => clip.sectionKey === ARTICLE_SECTION_KEY) ?? null
}
