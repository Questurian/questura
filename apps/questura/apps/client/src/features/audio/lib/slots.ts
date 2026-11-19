/**
 * AudioClip slots (ADR-0018): where a section's player sits on the page.
 *
 * The server writes an empty-looking player shell right under each narrated
 * section's H2 (and above the body for the Intro), so the page has the
 * player's space and look before any JavaScript runs. The real player, which
 * is loaded only on articles that have audio, mounts into the same element.
 *
 * Plain string work on the prose HTML: the H2s already carry their anchor id
 * (`headingAnchors.ts` on the server), and the section's key is that id.
 */

export const INTRO_SECTION_KEY = 'intro'

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

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ESCAPES[char])

export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds || 0))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

/** "1-min listen" for anything under ninety seconds, then whole minutes. */
export function listenMinutesLabel(totalSeconds: number): string {
  return `${Math.max(1, Math.round(totalSeconds / 60))}-min listen`
}

export function slotElementId(sectionKey: string): string {
  return `listen-${sectionKey}`
}

/** The player's shell, as HTML. The live player replaces what it shows. */
export function audioSlotHtml(clip: ArticleAudioClip): string {
  const key = escapeHtml(clip.sectionKey)
  return (
    `<div class="audio-slot" data-audio-slot="${key}" id="${escapeHtml(slotElementId(clip.sectionKey))}">` +
    `<div class="audio-shell" aria-hidden="true">` +
    `<span class="audio-shell-button"></span>` +
    `<span class="audio-shell-text"><span class="audio-shell-label">Listen to this section</span>` +
    `<span class="audio-shell-sub">${escapeHtml(clip.title)} · ${formatClock(clip.durationSeconds)}</span></span>` +
    `</div></div>`
  )
}

const H2_WITH_ID = /<h2\s[^>]*?id="([^"]+)"[^>]*>[\s\S]*?<\/h2>/g

/** Puts each narrated section's slot right after its heading. */
export function injectAudioSlots(html: string, clipsByKey: Map<string, ArticleAudioClip>): string {
  if (clipsByKey.size === 0 || !html.includes('<h2')) return html
  return html.replace(H2_WITH_ID, (heading: string, id: string) => {
    const clip = clipsByKey.get(id)
    return clip ? heading + audioSlotHtml(clip) : heading
  })
}

type SlotBlock = { blockType: string; content?: unknown; stayContent?: unknown }

/** The body's blocks with every narrated section's slot in place (the Intro's goes above the body). */
export function withAudioSlots<T extends SlotBlock>(blocks: T[], audio: ArticleAudio | null | undefined): T[] {
  if (!audio?.clips.length) return blocks
  const byKey = new Map(
    audio.clips.filter((clip) => clip.sectionKey !== INTRO_SECTION_KEY).map((clip) => [clip.sectionKey, clip]),
  )
  if (byKey.size === 0) return blocks
  return blocks.map((block) => {
    if (block.blockType === 'text' && typeof block.content === 'string') {
      return { ...block, content: injectAudioSlots(block.content, byKey) }
    }
    if (block.blockType === 'airbnb-card' && typeof block.stayContent === 'string') {
      return { ...block, stayContent: injectAudioSlots(block.stayContent, byKey) }
    }
    return block
  })
}

export function introClip(audio: ArticleAudio | null | undefined): ArticleAudioClip | null {
  return audio?.clips.find((clip) => clip.sectionKey === INTRO_SECTION_KEY) ?? null
}
