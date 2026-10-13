import { staffUser } from '@/features/auth/lib/staff-user'
import type { GlobalConfig } from 'payload'
import { signedInRead } from '@/features/auth/lib/signed-in-read'
import {
  revalidateMainHomepageAfterChange,
  revalidateSectionPageAfterChange,
} from '@/features/public-revalidation/revalidate-client'
import { CURATED_PAGES, type CuratedPageKey } from './pages'

function curatedPageGlobal(page: CuratedPageKey, description: string): GlobalConfig {
  const { globalSlug, label, path } = CURATED_PAGES[page]

  return {
    slug: globalSlug,
    label,
    admin: {
      group: 'Content',
      description,
    },
    access: {
      read: signedInRead,
      update: ({ req }) => {
        const role = staffUser(req.user)?.role
        return role === 'admin' || role === 'editor'
      },
    },
    hooks: {
      afterChange: [
        page === 'main'
          ? revalidateMainHomepageAfterChange
          : revalidateSectionPageAfterChange(page, path),
      ],
    },
    fields: [
      {
        name: 'draftPageBlocks',
        type: 'json',
        defaultValue: [],
        admin: {
          description: 'Private working copy for editors. Managed by the ABW homepage tool.',
        },
      },
      {
        name: 'publishedPageBlocks',
        type: 'json',
        defaultValue: [],
        admin: {
          description: 'Public-ready snapshot the website renders.',
          readOnly: true,
        },
      },
      {
        name: 'lastPublishedAt',
        type: 'date',
        admin: {
          position: 'sidebar',
          readOnly: true,
        },
      },
      {
        name: 'lastPublishedBy',
        type: 'relationship',
        relationTo: 'users',
        admin: {
          position: 'sidebar',
          readOnly: true,
        },
      },
      {
        name: 'publishedRevision',
        type: 'number',
        defaultValue: 0,
        min: 0,
        admin: {
          position: 'sidebar',
          readOnly: true,
        },
      },
    ],
  }
}

export const MainHomepage = curatedPageGlobal(
  'main',
  'Singleton curated homepage for the main domain homepage.',
)
export const EatPage = curatedPageGlobal('eat', 'Curated blocks for the navbar Eat page (/eat).')
export const StayPage = curatedPageGlobal('stay', 'Curated blocks for the navbar Stay page (/stay).')
export const ItinerariesPage = curatedPageGlobal(
  'itineraries',
  'Curated blocks for the navbar Itineraries page (/itineraries).',
)

export const CuratedPageGlobals: GlobalConfig[] = [MainHomepage, EatPage, StayPage, ItinerariesPage]
