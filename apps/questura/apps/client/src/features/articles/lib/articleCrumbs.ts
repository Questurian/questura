import { isPublicPageEnabled } from '../../../lib/routing/peruLaunch.ts'
import { ARTICLE_TYPE_SEGMENTS } from '../../../lib/reservedSlugs.ts'

export type ArticleCrumb = {
  label: string
  href: string | null
}

function humanizeSegment(segment: string): string {
  return segment
    .split('-')
    .map((word) => (word ? `${word[0].toUpperCase()}${word.slice(1)}` : word))
    .join(' ')
}

/**
 * Visible trail from the public URL, minus the article slug. One source for
 * the crumbs a reader sees and the BreadcrumbList Google reads
 * (articleBreadcrumbJsonLd.ts), so the two never disagree.
 *
 * A crumb links only to a page that opens. Under the Peru launch `/peru` is
 * not a page, so Peru is a plain label (it used to link to a 404 on every
 * article). A category such as Safety or Intel has no page of its own: its
 * articles are listed on the place's Articles page, so that is where it links.
 *
 * `/peru/lima/maps/slug`   -> Peru > Lima > Maps     (Lima, Maps linked)
 * `/peru/lima/safety/slug` -> Peru > Lima > Safety   (Safety -> /peru/lima/articles)
 * `/peru/safety/slug`      -> Peru > Safety
 */
export function articleCrumbsFromPath(
  path: string | undefined,
  isOpen: (pathname: string) => boolean = isPublicPageEnabled,
): ArticleCrumb[] {
  if (!path) return []

  const segments = path.split('/').filter(Boolean)
  if (segments.length < 2) return []

  const intermediates = segments.slice(0, -1)
  return intermediates.map((segment, index) => {
    const own = `/${intermediates.slice(0, index + 1).join('/')}`
    const isType = ARTICLE_TYPE_SEGMENTS.has(segment.toLowerCase())
    const isCategory = !isType && index === intermediates.length - 1 && index > 0
    const target = isCategory ? `/${intermediates.slice(0, index).join('/')}/articles` : own
    return { label: humanizeSegment(segment), href: isOpen(target) ? target : null }
  })
}
