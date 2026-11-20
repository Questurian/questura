import type { CollectionConfig } from 'payload'

import { staffUser } from '@/features/auth/lib/staff-user'

/**
 * A Listen: one member playing one AudioClip during one visit to the page
 * (ADR-0018). Pausing and resuming in the same visit is the same Listen.
 *
 * Personal data by the owner's choice: who listened, when, how long and which
 * stretches of the clip they heard, so the studio can tell which guides people
 * listen to and where they stop. The privacy page says so, and
 * `scripts/erase-visitor-account.ts` deletes a reader's Listens with the rest
 * of their account.
 *
 * Keyed by the Better Auth user id like Bookmarks, and `clipId` / `articleId`
 * are plain numbers, so a deleted clip or article never blocks on its history.
 * Staff listens are stored with `isStaff` and left out of the numbers.
 *
 * Written only by `POST /api/public/audio/listens` on behalf of the member.
 */
export const AudioListens: CollectionConfig = {
  slug: 'audio-listens',
  labels: { singular: 'Listen', plural: 'Listens' },
  admin: {
    useAsTitle: 'listenId',
    defaultColumns: ['authUserId', 'articleId', 'sectionKey', 'secondsHeard', 'finished', 'startedAt'],
    group: 'Articles',
    hidden: ({ user }) => user?.collection !== 'users' || user?.role !== 'admin',
    description: 'Members’ listening history for AudioClips. Read in the AI Blog Writer Audio tab.',
  },
  access: {
    read: ({ req }) => staffUser(req.user)?.role === 'admin',
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  timestamps: true,
  fields: [
    { name: 'listenId', type: 'text', required: true, unique: true, admin: { readOnly: true } },
    { name: 'authUserId', type: 'text', required: true, index: true, admin: { readOnly: true } },
    { name: 'clipId', type: 'number', required: true, index: true, admin: { readOnly: true } },
    { name: 'articleId', type: 'number', required: true, index: true, admin: { readOnly: true } },
    { name: 'sectionKey', type: 'text', required: true, admin: { readOnly: true } },
    { name: 'isStaff', type: 'checkbox', defaultValue: false, admin: { readOnly: true } },
    { name: 'startedAt', type: 'date', required: true, index: true, admin: { readOnly: true } },
    { name: 'lastHeardAt', type: 'date', required: true, admin: { readOnly: true } },
    { name: 'secondsHeard', type: 'number', required: true, defaultValue: 0, admin: { readOnly: true } },
    { name: 'clipDuration', type: 'number', required: true, admin: { readOnly: true } },
    {
      name: 'ranges',
      type: 'json',
      admin: { readOnly: true, description: 'Stretches of the clip heard, as [from, to] seconds.' },
    },
    { name: 'speeds', type: 'json', admin: { readOnly: true, description: 'Playback speeds used.' } },
    { name: 'finished', type: 'checkbox', defaultValue: false, admin: { readOnly: true } },
  ],
}
