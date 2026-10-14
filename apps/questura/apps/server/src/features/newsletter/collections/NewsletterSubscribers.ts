import type { Access, CollectionConfig, FieldAccess } from 'payload'
import { staffUser } from '@/features/auth/lib/staff-user'
import { NEWSLETTER_SIGNUP_SOURCES, NEWSLETTER_SUBSCRIBER_STATUSES } from '../lib/constants'

const isAdmin: Access = ({ req }) => Boolean(req.user && staffUser(req.user)?.role === 'admin')

const nobody: FieldAccess = () => false

/**
 * One row per email address that ever asked for the Questurian newsletter.
 *
 * Payload owns the list; the sending service only ever holds a copy. That is
 * what lets the list leave the sending service intact, and it is why a row is
 * never deleted on unsubscribe: the row *is* the record that this address
 * said stop, and dropping it would let the next import mail them again.
 *
 * Signup is double opt-in and needs no account. A row starts `pending` and
 * only becomes `subscribed` when the reader clicks the link mailed to that
 * address, so nobody can put a stranger on the list. `bounced` and
 * `complained` are terminal for mail: the address is never sent a
 * confirmation again, because a spam complaint on this domain also costs the
 * password-reset mail that shares it.
 *
 * Every write is a Local API call from `/api/newsletter/*` with
 * `overrideAccess: true`. Admins may read the list and delete a row (an
 * erasure request); nobody edits one by hand, since a hand-set `subscribed`
 * would be a subscriber with no confirmation behind it.
 */
export const NewsletterSubscribers: CollectionConfig = {
  slug: 'newsletter-subscribers',
  labels: {
    singular: 'Newsletter subscriber',
    plural: 'Newsletter subscribers',
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'status', 'source', 'confirmedAt', 'createdAt'],
    group: 'Core',
    hidden: ({ user }) => user?.collection !== 'users' || user?.role !== 'admin',
    description: 'Questurian newsletter list. Rows are written by the signup and confirm endpoints only.',
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
      name: 'email',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: 'Stored trimmed and lowercased, so one address is one row.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      index: true,
      defaultValue: 'pending',
      options: NEWSLETTER_SUBSCRIBER_STATUSES.map((value) => ({ label: value, value })),
      admin: {
        readOnly: true,
        description:
          'pending: confirmation mailed, not clicked. subscribed: confirmed. unsubscribed: asked to stop. bounced / complained: never mailed again.',
      },
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      options: NEWSLETTER_SIGNUP_SOURCES.map((value) => ({ label: value, value })),
      admin: {
        readOnly: true,
        description: 'Which form the latest signup came from. Part of the consent record.',
      },
    },
    {
      name: 'signedUpAt',
      type: 'date',
      required: true,
      admin: {
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
        description: 'When the latest signup was submitted. Part of the consent record.',
      },
    },
    {
      name: 'confirmedAt',
      type: 'date',
      admin: {
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
        description: 'When the reader clicked the confirmation link. Empty means never confirmed.',
      },
    },
    {
      name: 'unsubscribedAt',
      type: 'date',
      admin: {
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'suppressedAt',
      type: 'date',
      admin: {
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
        description: 'When the address hard-bounced or reported spam.',
      },
    },
    {
      // sha256 of the token mailed in the confirmation link. The token itself
      // is never stored, so a database read cannot confirm anyone.
      name: 'confirmTokenHash',
      type: 'text',
      index: true,
      access: { read: nobody, update: nobody, create: nobody },
      admin: { hidden: true },
    },
    {
      name: 'confirmTokenExpiresAt',
      type: 'date',
      access: { read: nobody, update: nobody, create: nobody },
      admin: { hidden: true },
    },
  ],
}
