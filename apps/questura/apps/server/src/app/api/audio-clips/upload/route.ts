import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { authenticateRequest } from '@/features/auth/lib/auth-middleware'
import { staffUser } from '@/features/auth/lib/staff-user'
import { parseSentences } from '@/features/audio-clips/lib/public-audio'
import { loadArticleSections } from '@/features/audio-clips/lib/service'
import {
  AudioStorageUnavailable,
  audioStorageConfig,
  audioStorageKey,
  deleteAudioFile,
  uploadAudioFile,
} from '@/features/audio-clips/lib/storage'
import { logger } from '@/shared/utils/logger'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }
const MAX_BYTES = 60 * 1024 * 1024

function fail(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers: NO_STORE })
}

/** An MP3 starts with an ID3 tag or an MPEG frame sync. */
function looksLikeMp3(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true
  return bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0
}

/**
 * POST /api/audio-clips/upload  (multipart: `file` = the MP3, `meta` = JSON)
 *
 * Stores one AudioClip (ADR-0018): the MP3 goes to the private audio zone,
 * then the row is created, or replaced if the section already has a clip, and
 * the old file is deleted. Editors and admins only. The AI Blog Writer's
 * Audio tab is the caller; it makes the MP3 with ElevenLabs and sends it here
 * with what was read and when.
 *
 * `meta`: { articleId, sectionKey, sentences: [{ text, start, end }],
 *           durationSeconds, voiceId, voiceName, model }
 *
 * The section must exist in the article as it is now, so a clip is never
 * stored against a heading the page does not have.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req, { requireAuth: true })
  const staff = staffUser(auth.user)
  if (auth.error || !staff) return fail(auth.error ?? 'Authentication required', auth.status === 200 ? 403 : auth.status)
  if (staff.role !== 'admin' && staff.role !== 'editor') return fail('Editor or admin role required', 403)
  if (!audioStorageConfig()) return fail('Audio storage is not configured yet (BUNNY_AUDIO_* variables).', 503)

  const form = await req.formData().catch(() => null)
  if (!form) return fail('multipart form data required', 400)
  const file = form.get('file')
  const metaRaw = form.get('meta')
  if (!(file instanceof Blob)) return fail('file required', 400)
  if (typeof metaRaw !== 'string') return fail('meta required', 400)
  if (file.size === 0 || file.size > MAX_BYTES) return fail('file must be between 1 byte and 60 MB', 400)

  let meta: Record<string, unknown>
  try {
    meta = JSON.parse(metaRaw) as Record<string, unknown>
  } catch {
    return fail('meta must be JSON', 400)
  }

  const articleId = Number(meta.articleId)
  const sectionKey = typeof meta.sectionKey === 'string' ? meta.sectionKey.trim() : ''
  const sentences = parseSentences(meta.sentences)
  const durationSeconds = Number(meta.durationSeconds)
  const voiceId = typeof meta.voiceId === 'string' ? meta.voiceId.trim() : ''
  const voiceName = typeof meta.voiceName === 'string' ? meta.voiceName.trim() : ''
  const model = typeof meta.model === 'string' ? meta.model.trim() : ''
  if (!Number.isInteger(articleId) || articleId <= 0) return fail('articleId must be a positive integer', 400)
  if (!sectionKey) return fail('sectionKey required', 400)
  if (!sentences) return fail('sentences must be a list of { text, start, end }', 400)
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 4 * 3600) {
    return fail('durationSeconds must be a positive number', 400)
  }
  if (!voiceId || !voiceName || !model) return fail('voiceId, voiceName and model required', 400)

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!looksLikeMp3(bytes)) return fail('file must be an MP3', 400)

  const payload = await getPayload({ config })
  const loaded = await loadArticleSections(payload, articleId)
  if (!loaded) return fail('Article not found.', 404)
  const section = loaded.sections.find((entry) => entry.key === sectionKey)
  if (!section) return fail(`The article has no section "${sectionKey}" now.`, 409)

  const storageKey = audioStorageKey(articleId, sectionKey)
  try {
    await uploadAudioFile(storageKey, bytes)
  } catch (error) {
    if (error instanceof AudioStorageUnavailable) return fail(error.message, 503)
    logger.error('[audio-clips] upload to storage failed', { articleId, sectionKey, error: String(error) })
    return fail('Could not store the audio file.', 502)
  }

  const data = {
    articleId,
    sectionKey,
    sectionTitle: section.title,
    sentences,
    durationSeconds: Math.round(durationSeconds * 100) / 100,
    voiceId,
    voiceName,
    model,
    storageKey,
    bytes: bytes.length,
  }

  try {
    const existing = await payload.find({
      collection: 'audio-clips',
      where: { and: [{ articleId: { equals: articleId } }, { sectionKey: { equals: sectionKey } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const previous = existing.docs[0] as unknown as { id: number; storageKey?: string } | undefined
    const doc = previous
      ? await payload.update({ collection: 'audio-clips', id: previous.id, data, overrideAccess: true })
      : await payload.create({ collection: 'audio-clips', data, overrideAccess: true })
    if (previous?.storageKey && previous.storageKey !== storageKey) {
      await deleteAudioFile(previous.storageKey).catch((error: unknown) =>
        logger.error('[audio-clips] old file not deleted', { storageKey: previous.storageKey, error: String(error) }),
      )
    }
    return NextResponse.json({ clip: doc, replaced: Boolean(previous) }, { status: previous ? 200 : 201, headers: NO_STORE })
  } catch (error) {
    await deleteAudioFile(storageKey).catch(() => undefined)
    logger.error('[audio-clips] could not save clip row', { articleId, sectionKey, error: String(error) })
    return fail('Could not save the clip.', 500)
  }
}
