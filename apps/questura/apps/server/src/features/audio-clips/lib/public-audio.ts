import type { Payload } from 'payload'

import { INTRO_SECTION_KEY } from './sections'

export type ClipSentence = { text: string; start: number; end: number }

/**
 * The reader-facing side of AudioClips: what a cached public page may carry.
 * Kept apart from the studio service so the article serializer can use it
 * without importing itself.
 */

/** What every reader's page gets: enough to draw the players and the badge, never the text or the file. */
export type PublicAudioClip = {
  id: number
  sectionKey: string
  title: string
  durationSeconds: number
  voiceName: string
}

export type PublicArticleAudio = {
  clips: PublicAudioClip[]
  totalSeconds: number
}

export type ClipRow = {
  id: number
  articleId: number
  sectionKey: string
  sectionTitle: string
  sentences: unknown
  durationSeconds: number
  voiceId: string
  voiceName: string
  model: string
  storageKey: string
  bytes?: number | null
  updatedAt?: string
  createdAt?: string
}

export function parseSentences(raw: unknown): ClipSentence[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 2000) return null
  const out: ClipSentence[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const { text, start, end } = item as Record<string, unknown>
    if (typeof text !== 'string' || !text.trim() || text.length > 2000) return null
    if (typeof start !== 'number' || typeof end !== 'number' || !Number.isFinite(start) || !Number.isFinite(end)) return null
    if (start < 0 || end < start) return null
    out.push({ text: text.trim(), start: Math.round(start * 100) / 100, end: Math.round(end * 100) / 100 })
  }
  return out
}

export async function findClipsForArticle(payload: Payload, articleId: number): Promise<ClipRow[]> {
  const result = await payload.find({
    collection: 'audio-clips',
    where: { articleId: { equals: articleId } },
    limit: 200,
    depth: 0,
    overrideAccess: true,
  })
  return result.docs as unknown as ClipRow[]
}

/**
 * The article's playable clips, in no particular order (the page orders them
 * by where their sections fall). A clip whose heading is gone is left out:
 * the studio shows it as "Not attached", the site does not draw it.
 */
export async function publicAudioForArticle(
  payload: Payload,
  articleId: number,
  headingIdsInOrder: string[],
): Promise<PublicArticleAudio | null> {
  // Page order: the Intro first, then each section where its heading falls.
  const order = new Map<string, number>([[INTRO_SECTION_KEY, -1]])
  headingIdsInOrder.forEach((id, index) => order.set(id, index))
  const clips = (await findClipsForArticle(payload, articleId))
    .filter((clip) => order.has(clip.sectionKey))
    .sort((a, b) => (order.get(a.sectionKey) ?? 0) - (order.get(b.sectionKey) ?? 0))
    .map((clip) => ({
      id: clip.id,
      sectionKey: clip.sectionKey,
      title: clip.sectionTitle,
      durationSeconds: Number(clip.durationSeconds),
      voiceName: clip.voiceName,
    }))
  if (clips.length === 0) return null
  return { clips, totalSeconds: Math.round(clips.reduce((sum, clip) => sum + clip.durationSeconds, 0)) }
}

/** Which of these articles have at least one clip, for the cards' Audio badge. */
export async function articleIdsWithAudio(payload: Payload, articleIds: number[]): Promise<Set<number>> {
  const ids = [...new Set(articleIds.filter((id) => Number.isInteger(id)))]
  if (ids.length === 0) return new Set()
  const result = await payload.find({
    collection: 'audio-clips',
    where: { articleId: { in: ids } },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
    select: { articleId: true },
  })
  return new Set((result.docs as unknown as Array<{ articleId: number }>).map((doc) => Number(doc.articleId)))
}

