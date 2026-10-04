/**
 * Airbnbs Collection
 * One Airbnb listing: a link, photos and a short write-up. Not a Place: no
 * Google place, address or map pin. `locationRef` only tags the neighbourhood
 * so a "best Airbnbs in <neighbourhood>" list can find it.
 */

import { staffUser } from '@/features/auth/lib/staff-user'
import { serviceAccountHasCollectionGrant } from '@/features/auth/lib/service-account-grants'
import { CollectionConfig } from 'payload'

const urlValidationMessage =
  'Enter a valid absolute URL, for example https://www.airbnb.com/rooms/12345.'

const isValidAbsoluteUrl = (value: string | null | undefined): boolean => {
  if (!value) return false

  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export const Airbnbs: CollectionConfig = {
  slug: 'airbnbs',
  labels: {
    singular: 'Airbnb',
    plural: 'Airbnbs',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'locationRef', 'price', 'status', 'updatedAt'],
    group: 'Travel Data',
  },
  access: {
    read: ({ req }) => {
      if (!req.user) return false
      return (
        serviceAccountHasCollectionGrant(req.user, 'airbnbs', 'read') ||
        Boolean(staffUser(req.user))
      )
    },
    create: ({ req }) => {
      const role = staffUser(req.user)?.role
      return (
        serviceAccountHasCollectionGrant(req.user, 'airbnbs', 'create') ||
        role === 'editor' ||
        role === 'admin'
      )
    },
    update: ({ req }) => {
      const role = staffUser(req.user)?.role
      return (
        serviceAccountHasCollectionGrant(req.user, 'airbnbs', 'update') ||
        role === 'admin' ||
        role === 'editor'
      )
    },
    delete: ({ req }) => staffUser(req.user)?.role === 'admin',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Our display title, not the host listing title',
      },
    },
    {
      name: 'listingUrl',
      label: 'Listing URL',
      type: 'text',
      required: true,
      unique: true,
      validate: (value: string | null | undefined) =>
        isValidAbsoluteUrl(value) ? true : urlValidationMessage,
      admin: {
        description: 'The Airbnb listing page',
      },
    },
    {
      name: 'stayType',
      label: 'Type',
      type: 'text',
      admin: {
        description: 'For example "Entire 3-bedroom apartment, sleeps 6"',
      },
    },
    {
      name: 'near',
      type: 'text',
      admin: {
        description: 'What it is near, for example "Two blocks from Kennedy Park"',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Short reason it is worth booking',
      },
    },
    {
      name: 'price',
      type: 'text',
      admin: {
        description: 'Flexible display price, for example "From $85/night"',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'rating',
          type: 'number',
          min: 0,
          max: 5,
          admin: {
            description: 'Airbnb star rating, for example 4.95',
            step: 0.01,
          },
        },
        {
          name: 'reviewCount',
          label: 'Review count',
          type: 'number',
          min: 0,
          admin: {
            description: 'Number of Airbnb reviews behind the rating',
          },
        },
      ],
    },
    {
      name: 'gallery',
      type: 'array',
      maxRows: 20,
      admin: {
        description: 'Photos for this Airbnb (first image is featured)',
      },
      fields: [
        {
          name: 'image',
          type: 'relationship',
          relationTo: 'media-sets',
          required: true,
          admin: {
            description: 'Gallery media set',
          },
        },
        {
          name: 'preview',
          type: 'ui',
          admin: {
            components: {
              Field: 'src/features/media/components/MediaSetPreview.tsx',
            },
          },
        },
      ],
    },
    {
      name: 'locationRef',
      label: 'Neighbourhood',
      type: 'relationship',
      relationTo: 'locations',
      required: false,
      admin: {
        description:
          'Site organization: the neighbourhood this Airbnb is in. Set from Location Manager and synced with Payload.',
        position: 'sidebar',
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
        hidden: true,
        position: 'sidebar',
      },
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      defaultValue: 'draft',
      admin: { position: 'sidebar' },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // Only a human is credited. A machine caller authenticates as a
        // service account (ADR-0006), whose id would otherwise be written into
        // a `users` relationship and point at an unrelated person.
        const author = staffUser(req.user)
        if (operation === 'create' && author) {
          data.createdBy = author.id
        }

        return data
      },
    ],
  },
}
