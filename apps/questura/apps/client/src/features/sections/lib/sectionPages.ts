import type { Metadata } from 'next'

/**
 * Copy for the navbar section pages. The title tag and description carry the
 * search phrases; the page shows the short name as its <h1>, with the kicker
 * and dek as visible text that says the same thing in a sentence.
 *
 * Dependency-free (type import only) so the client's node:test suite can run it.
 */
export type SectionPageCopy = {
  path: string
  /** The <h1> and breadcrumb name. */
  name: string
  /** The title tag. Ends with the brand, like every page that sets one. */
  metaTitle: string
  description: string
  /** Small label above the <h1>. */
  kicker?: string
  /** The line beside (desktop) or under (phone) the <h1>. */
  dek?: string
}

export const SECTION_PAGES = {
  eat: {
    path: '/eat',
    name: 'Eat',
    metaTitle: 'Where to Eat: Restaurant Guides & Food Maps — Questurian',
    description:
      'Where to eat in Lima, Medellín, Mexico City and across Latin America: Questurian restaurant guides and food maps, from ceviche and chifa to tacos al pastor, coffee and fine dining.',
    kicker: 'Restaurant guides & food maps',
    dek: 'The ceviche counters, chifas, taquerías, coffee bars and dining rooms worth building a day around, mapped city by city across Latin America.',
  },
  stay: {
    path: '/stay',
    name: 'Stay',
    metaTitle: 'Where to Stay: Hotel & Neighborhood Guides — Questurian',
    description:
      'Where to stay in Lima and across Latin America: Questurian guides to hotels, apartments and the neighborhoods worth basing yourself in.',
    kicker: 'Hotels, rentals & neighborhoods',
    dek: 'Hotels, apartments and the neighborhoods worth basing yourself in, so the trip starts from the right front door.',
  },
  itineraries: {
    path: '/itineraries',
    name: 'Itineraries',
    metaTitle: 'Travel Itineraries: Day-by-Day City Plans — Questurian',
    description:
      'Day-by-day travel itineraries for Lima and across Latin America from Questurian: where to go, eat and drink, planned around how a city actually moves.',
    kicker: 'Day-by-day city plans',
    dek: 'Plans that string a city together, from the first coffee to the last drink, planned around how it actually moves.',
  },
  newsletters: {
    path: '/newsletters',
    name: 'Newsletters',
    metaTitle: 'The Questurian Newsletter: Monthly Travel Guides — Questurian',
    description:
      'Sign up for the free Questurian newsletter: once a month, our newest travel guides, food maps and itineraries for Latin America, with a short note from the team.',
    kicker: 'Monthly, free',
    // No dek: at 1024px the one-word title is wider than its grid column, so
    // a dek beside it would collide. The page opens its signup with that line.
  },
} as const satisfies Record<string, SectionPageCopy>

export type SectionKey = keyof typeof SECTION_PAGES

export function sectionPageMetadata(copy: SectionPageCopy): Metadata {
  return {
    title: copy.metaTitle,
    description: copy.description,
    alternates: { canonical: copy.path },
    openGraph: {
      title: copy.metaTitle,
      description: copy.description,
      url: copy.path,
      type: 'website',
      siteName: 'Questurian',
    },
  }
}
