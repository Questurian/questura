export const LIMA_HREF = '/peru/lima'

// Live content and previews of it use the Peru launch scope. Readiness
// and development databases can still exercise the full destination routes.
const apiOrigin = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, '')
export const PERU_LAUNCH_ENABLED =
  apiOrigin === 'https://api.questurian.com' || apiOrigin === 'https://cms.questurian.com'

const SITE_PAGES = new Set([
  '/',
  LIMA_HREF,
  '/about',
  '/eat',
  '/stay',
  '/itineraries',
  '/auth-callback-close',
  '/auth-error',
  '/contact',
  '/faq',
  '/join',
  '/newsletters/confirm',
  '/privacy',
  '/search',
  '/terms',
])

const SITE_SECTIONS = new Set([
  'account',
  'auth',
  'authors',
  'purchase',
  'studio-preview',
  'subscription',
])

// Cities outside Peru whose map guides are open before the rest of the city
// is (owner, 2026-11-18: Medellín rooftops). Only /<country>/<city>/maps/<slug>
// opens; the city page and its other sections stay offline.
const OPEN_MAP_GUIDE_CITIES = new Set(['colombia/medellin'])

function isOpenMapGuide(pathname: string): boolean {
  const [, country, city, section, slug, rest] = pathname.split('/')
  return OPEN_MAP_GUIDE_CITIES.has(`${country}/${city}`)
    && section === 'maps'
    && Boolean(slug)
    && rest === undefined
}

// The editorial landing pages and Lima content share the site with routes
// used by existing readers. Keep legacy article URLs for canonical redirects.
export function isPublicPageEnabled(pathname: string): boolean {
  if (!PERU_LAUNCH_ENABLED || SITE_PAGES.has(pathname)) return true
  const [, section, slug, rest] = pathname.split('/')
  return SITE_SECTIONS.has(section)
    || pathname.startsWith(`${LIMA_HREF}/`)
    || (section === 'articles' && Boolean(slug) && !rest)
    || isOpenMapGuide(pathname)
}

export function publicLocationHref(locationKey: string): string | null {
  const [country, city] = locationKey.split('|')
  if (!PERU_LAUNCH_ENABLED) return city ? `/${country}/${city}` : `/${country}`
  if (locationKey === 'peru') return '/'
  if (country === 'peru' && city === 'lima') return LIMA_HREF
  return null
}
