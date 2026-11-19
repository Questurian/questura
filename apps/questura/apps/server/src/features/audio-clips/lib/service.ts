import type { Payload } from 'payload'

import { serializeArticleByCollection } from '@/features/articles/public/serializeArticleBlocks'

import { findClipsForArticle, parseSentences, type ClipRow } from './public-audio'

export type { ClipSentence } from './public-audio'
import { clipMatchesSection, sectionsFromBlocks, scriptFromSentences, type ArticleSection } from './sections'

/** The article's sections, read from its whole body exactly as the page anchors it. */
export async function loadArticleSections(payload: Payload, articleId: number): Promise<{
  article: { id: number; title: string; status: string }
  sections: ArticleSection[]
} | null> {
  const article = (await payload
    .findByID({ collection: 'articles', id: articleId, depth: 2, overrideAccess: true })
    .catch(() => null)) as Record<string, unknown> | null
  if (!article) return null
  // Strip anything that would make serialization resolve the audio again.
  await serializeArticleByCollection('articles', article, payload, { skipAudio: true })
  const blocks = Array.isArray(article.contentBlocks) ? (article.contentBlocks as Array<Record<string, unknown>>) : []
  return {
    article: { id: articleId, title: String(article.title ?? ''), status: String(article.status ?? '') },
    sections: sectionsFromBlocks(blocks),
  }
}

export type StudioSectionView = {
  key: string
  title: string
  script: string
  characters: number
  sentenceCount: number
  /** What the Narrator reads, sentence by sentence: the studio records these. */
  sentences: string[]
  clip: StudioClipView | null
}

export type StudioClipView = {
  id: number
  sectionKey: string
  sectionTitle: string
  durationSeconds: number
  sentenceCount: number
  characters: number
  voiceId: string
  voiceName: string
  model: string
  updatedAt: string | null
  /** `current`: still the section's words. `out-of-date`: the text changed. `not-attached`: its heading is gone. */
  status: 'current' | 'out-of-date' | 'not-attached'
  /** Covers the whole section, or stops early. */
  partial: boolean
}

/** The studio's Audio tab: every section with its clip, plus clips whose heading is gone. */
export async function studioAudioView(payload: Payload, articleId: number) {
  const loaded = await loadArticleSections(payload, articleId)
  if (!loaded) return null
  const clips = await findClipsForArticle(payload, articleId)
  const byKey = new Map(clips.map((clip) => [clip.sectionKey, clip]))

  const clipView = (clip: ClipRow, section: ArticleSection | null): StudioClipView => {
    const sentences = parseSentences(clip.sentences) ?? []
    const texts = sentences.map((sentence) => sentence.text)
    return {
      id: clip.id,
      sectionKey: clip.sectionKey,
      sectionTitle: clip.sectionTitle,
      durationSeconds: clip.durationSeconds,
      sentenceCount: sentences.length,
      characters: scriptFromSentences(texts).length,
      voiceId: clip.voiceId,
      voiceName: clip.voiceName,
      model: clip.model,
      updatedAt: clip.updatedAt ?? null,
      status: !section ? 'not-attached' : clipMatchesSection(texts, section.sentences) ? 'current' : 'out-of-date',
      partial: Boolean(section) && texts.length < (section?.sentences.length ?? 0),
    }
  }

  const sections: StudioSectionView[] = loaded.sections.map((section) => {
    const script = scriptFromSentences(section.sentences)
    const clip = byKey.get(section.key)
    return {
      key: section.key,
      title: section.title,
      script,
      characters: script.length,
      sentenceCount: section.sentences.length,
      sentences: section.sentences,
      clip: clip ? clipView(clip, section) : null,
    }
  })
  const sectionKeys = new Set(loaded.sections.map((section) => section.key))
  const notAttached = clips.filter((clip) => !sectionKeys.has(clip.sectionKey)).map((clip) => clipView(clip, null))

  return { article: loaded.article, sections, notAttached }
}
