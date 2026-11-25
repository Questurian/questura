import type { ArticleScope, ArticleTypeKey } from './articleScope.ts'

/**
 * Names for the list pages (`/peru/lima/maps`, `/peru/lima/articles`,
 * `/peru/lima/itineraries`, …): the heading a reader sees and the title and
 * description Google shows. Before this, those pages had no title of their
 * own, so search results showed them as just "Questurian".
 */

const TYPE_LABEL: Record<ArticleTypeKey, string> = {
  articles: 'Articles',
  maps: 'Maps',
  itineraries: 'Itineraries',
}

export function formatSegmentName(segment: string): string {
  return segment
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function placeName(scope: ArticleScope): string | null {
  if (scope.kind === 'global') return null
  return formatSegmentName(scope.kind === 'country' ? scope.country : scope.city)
}

/** The page's own heading: "Lima Maps", "Peru Articles", "Itineraries". */
export function scopeHeading(scope: ArticleScope, type: ArticleTypeKey): string {
  const place = placeName(scope)
  return place ? `${place} ${TYPE_LABEL[type]}` : TYPE_LABEL[type]
}

const TITLE: Record<ArticleTypeKey, string> = {
  maps: 'Maps: Where to Eat, Drink and Go Out',
  itineraries: 'Itineraries: Day-by-Day Plans',
  articles: 'Travel Articles and Guides',
}

/** "Lima Maps: Where to Eat, Drink and Go Out — Questurian", with "(Page 2)" after page one. */
export function articleIndexTitle(scope: ArticleScope, type: ArticleTypeKey, page: number): string {
  const place = placeName(scope)
  const name = place ? `${place} ${TITLE[type]}` : TITLE[type]
  return `${name}${page > 1 ? ` (Page ${page})` : ''} — Questurian`
}

export function articleIndexDescription(scope: ArticleScope, type: ArticleTypeKey): string {
  const place = placeName(scope)
  if (type === 'maps') {
    return place
      ? `Every Questurian map of ${place}: where to eat, drink and go out, with each place pinned on the map.`
      : 'Every Questurian map: where to eat, drink and go out, with each place pinned on the map.'
  }
  if (type === 'itineraries') {
    return place
      ? `Day-by-day ${place} itineraries from Questurian, with every stop on a map.`
      : 'Day-by-day itineraries from Questurian, with every stop on a map.'
  }
  return place
    ? `Every Questurian article on ${place}: where to stay, neighborhoods, safety, food and planning a trip.`
    : 'Every Questurian article: where to stay, neighborhoods, safety, food and planning a trip.'
}
