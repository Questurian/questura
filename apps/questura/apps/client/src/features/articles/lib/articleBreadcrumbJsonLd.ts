import { getPublicBaseUrl } from '../../../lib/seo/publicBaseUrl.ts'
import { isPublicPageEnabled } from '../../../lib/routing/peruLaunch.ts'
import { articleCrumbsFromPath } from './articleCrumbs.ts'

const PUBLIC_BASE_URL = getPublicBaseUrl()

type BuildBreadcrumbParams = {
  /** Canonical article path, e.g. /italy/rome/maps/best-bars-in-trastevere */
  path: string
  articleTitle: string
  /** Which pages open; the Peru launch rule by default. */
  isOpen?: (pathname: string) => boolean
}

/**
 * BreadcrumbList for an article: Home, then every visible crumb that links
 * somewhere (articleCrumbs.ts), then the article. A crumb that is only a label
 * (Peru under the Peru launch) is left out, because each step here must be a
 * page Google can open; it used to list `/peru` and `/peru/lima/intel`, which
 * are 404s.
 */
export function buildArticleBreadcrumbJsonLd({
  path,
  articleTitle,
  isOpen = isPublicPageEnabled,
}: BuildBreadcrumbParams): Record<string, unknown> {
  const base = PUBLIC_BASE_URL.replace(/\/+$/, '')
  const steps = [
    { name: 'Home', item: `${base}/` },
    ...articleCrumbsFromPath(path, isOpen).flatMap((crumb) =>
      crumb.href ? [{ name: crumb.label, item: `${base}${crumb.href}` }] : [],
    ),
    { name: articleTitle, item: `${base}${path}` },
  ]

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: steps.map((step, index) => ({ '@type': 'ListItem', position: index + 1, ...step })),
  }
}
