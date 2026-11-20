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

/** "00:46" under an hour, "01:09:17" from an hour up; `longest` keeps both ends of the bar alike. */
export function formatPlayerClock(seconds: number, longest = seconds): string {
  const whole = Math.max(0, Math.floor(seconds || 0))
  const pad = (value: number) => String(value).padStart(2, '0')
  const minutesAndSeconds = `${pad(Math.floor(whole / 60) % 60)}:${pad(whole % 60)}`
  return longest >= 3600 ? `${pad(Math.floor(whole / 3600))}:${minutesAndSeconds}` : `${pad(Math.floor(whole / 60))}:${pad(whole % 60)}`
}

/** "69 minutes" beside the Listen button; anything under ninety seconds is "1 minute". */
export function listenMinutesLabel(totalSeconds: number): string {
  const minutes = Math.max(1, Math.round(totalSeconds / 60))
  return minutes === 1 ? '1 minute' : `${minutes} minutes`
}

export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds || 0))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

export function slotElementId(sectionKey: string): string {
  return `listen-${sectionKey}`
}

/** The second, quiet Listen button in a dark header (same recording, same player). */
export function headerSlotElementId(sectionKey: string): string {
  return `listen-${sectionKey}-header`
}

/** The one recording a standard article plays. */
export function articleClip(audio: ArticleAudio | null | undefined): ArticleAudioClip | null {
  return audio?.clips.find((clip) => clip.sectionKey === ARTICLE_SECTION_KEY) ?? null
}
