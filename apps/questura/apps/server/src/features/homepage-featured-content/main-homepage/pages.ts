/**
 * The site-wide curated pages. The main homepage and the navbar's section
 * pages (Eat, Stay, Itineraries) are the same thing: one Payload global each,
 * holding a draft and a published list of homepage blocks, edited in the ABW
 * homepage tool and rendered with the city homepage's block components.
 */
export const CURATED_PAGES = {
  main: { globalSlug: 'main-homepage', label: 'Main Homepage', path: '/' },
  eat: { globalSlug: 'eat-page', label: 'Eat Page', path: '/eat' },
  stay: { globalSlug: 'stay-page', label: 'Stay Page', path: '/stay' },
  itineraries: { globalSlug: 'itineraries-page', label: 'Itineraries Page', path: '/itineraries' },
} as const

export type CuratedPageKey = keyof typeof CURATED_PAGES
export type CuratedPageGlobalSlug = (typeof CURATED_PAGES)[CuratedPageKey]['globalSlug']

export const CURATED_PAGE_KEYS = Object.keys(CURATED_PAGES) as CuratedPageKey[]

export function isCuratedPageKey(value: unknown): value is CuratedPageKey {
  return typeof value === 'string' && Object.hasOwn(CURATED_PAGES, value)
}

/** `?page=` on the homepage editor routes. Missing means the main homepage. */
export function curatedPageFromSearchParams(searchParams: URLSearchParams): CuratedPageKey | null {
  const raw = searchParams.get('page')
  if (raw === null || raw === '') return 'main'
  return isCuratedPageKey(raw) ? raw : null
}
