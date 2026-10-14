import type { Access, CollectionConfig } from 'payload'
import { staffUser } from '@/features/auth/lib/staff-user'

const isAdmin: Access = ({ req }) => Boolean(req.user && staffUser(req.user)?.role === 'admin')

/**
 * One row per newsletter issue that went out to the list.
 *
 * Written once by `sendIssue` right after Resend accepts the broadcast, with
 * the recipient count `reconcileBeforeSend` measured. It is the record the
 * Studio stats read: Resend's broadcast list has no recipient count and no
 * article list, and it is not the source of truth for anything here.
 *
 * Nobody creates or edits a row by hand. Admins may read and delete.
 */
export const NewsletterIssues: CollectionConfig = {
  slug: 'newsletter-issues',
  labels: {
    singular: 'Newsletter issue',
    plural: 'Newsletter issues',
  },
  // Read-only rows never need admin-panel edit locking.
  lockDocuments: false,
  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'sentAt', 'recipients'],
    group: 'Core',
    hidden: ({ user }) => user?.collection !== 'users' || user?.role !== 'admin',
    description: 'Issues sent to the newsletter list. Rows are written by the send endpoint only.',
  },
  access: {
    read: isAdmin,
    create: () => false,
    update: () => false,
    delete: isAdmin,
  },
  timestamps: true,
  fields: [
    {
      name: 'subject',
      type: 'text',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'sentAt',
      type: 'date',
      required: true,
      index: true,
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'recipients',
      type: 'number',
      required: true,
      admin: { readOnly: true, description: 'Confirmed subscribers in the Resend segment when the issue was sent.' },
    },
    {
      name: 'broadcastId',
      type: 'text',
      required: true,
      unique: true,
      admin: { readOnly: true, description: 'The Resend broadcast that carried the issue.' },
    },
    {
      name: 'items',
      type: 'json',
      required: true,
      admin: { readOnly: true, description: 'The articles in the issue, as { type, id } references.' },
    },
    {
      name: 'sentBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
    },
  ],
}
