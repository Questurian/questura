import type { JSX } from 'react'
import Link from '@/components/navigation/PublicLink'
import { articleCrumbsFromPath } from '@/features/articles/lib/articleCrumbs'

/**
 * The small blue "PERU › LIMA › MAPS" line over a page's title. Standard
 * articles had it first; maps and itineraries show the same line, so every
 * guide links back to its place and to the list it belongs to. Crumbs that
 * have no page (Peru, under the Peru launch) are plain labels.
 */
export function ArticleCrumbsNav({
  path,
  className = '',
}: {
  path?: string
  className?: string
}): JSX.Element | null {
  const crumbs = articleCrumbsFromPath(path)
  if (crumbs.length === 0) return null
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-x-1.5 font-[family-name:var(--font-dm-sans)] text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
        {crumbs.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`} className="flex items-center gap-x-1.5">
            {index > 0 ? <span aria-hidden className="text-accent/60">›</span> : null}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:underline">
                {crumb.label}
              </Link>
            ) : (
              <span>{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
