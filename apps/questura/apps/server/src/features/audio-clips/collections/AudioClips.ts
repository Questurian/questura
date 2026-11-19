import type { CollectionConfig } from 'payload'

import { staffUser } from '@/features/auth/lib/staff-user'
import { deleteAudioClipFileAfterDelete, revalidateAudioClipArticle } from '../lib/hooks'

/**
 * An AudioClip: one narrated recording of one Article section (ADR-0018).
 *
 * Lives beside the article, never inside it. The studio's sync replaces the
 * article body wholesale with new block ids, so anything stored in the body
 * would be wiped; this row survives every sync and names its section by the
 * heading's anchor id (`intro` for the text before the first H2).
 *
 * `articleId` is a plain number, not a foreign key, like Bookmarks: a clip
 * must never stop an editor deleting an article.
 *
 * Written only by `POST /api/audio-clips/upload` (staff, Local API with
 * `overrideAccess`), which stores the file in the private Bunny zone first.
 * Deleting a row deletes its file.
 */
const isEditor = (user: unknown) => {
  const staff = staffUser(user as Parameters<typeof staffUser>[0])
  return staff?.role === 'admin' || staff?.role === 'editor'
}

export const AudioClips: CollectionConfig = {
  slug: 'audio-clips',
  labels: { singular: 'AudioClip', plural: 'AudioClips' },
  admin: {
    useAsTitle: 'sectionTitle',
    defaultColumns: ['articleId', 'sectionTitle', 'voiceName', 'durationSeconds', 'updatedAt'],
    group: 'Articles',
    description: 'Members-only narration of article sections. Made and replaced from the AI Blog Writer Audio tab.',
  },
  access: {
    read: ({ req }) => {
      const staff = staffUser(req.user)
      return staff?.role === 'admin' || staff?.role === 'editor' || staff?.role === 'writer'
    },
    create: () => false,
    update: () => false,
    delete: ({ req }) => isEditor(req.user),
  },
  hooks: {
    afterChange: [revalidateAudioClipArticle],
    afterDelete: [deleteAudioClipFileAfterDelete],
  },
  timestamps: true,
  fields: [
    { name: 'articleId', type: 'number', required: true, index: true, admin: { readOnly: true } },
    {
      name: 'sectionKey',
      type: 'text',
      required: true,
      admin: { readOnly: true, description: 'The section heading’s anchor id, or "intro".' },
    },
    { name: 'sectionTitle', type: 'text', required: true, admin: { readOnly: true } },
    {
      name: 'sentences',
      type: 'json',
      required: true,
      admin: { readOnly: true, description: 'What was read, sentence by sentence, with start and end seconds.' },
    },
    { name: 'durationSeconds', type: 'number', required: true, admin: { readOnly: true } },
    { name: 'voiceId', type: 'text', required: true, admin: { readOnly: true } },
    { name: 'voiceName', type: 'text', required: true, admin: { readOnly: true } },
    { name: 'model', type: 'text', required: true, admin: { readOnly: true } },
    {
      name: 'storageKey',
      type: 'text',
      required: true,
      admin: { readOnly: true, description: 'Path in the private audio storage zone. Never public.' },
    },
    { name: 'bytes', type: 'number', admin: { readOnly: true } },
  ],
  indexes: [{ fields: ['articleId', 'sectionKey'], unique: true }],
}
