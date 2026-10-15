import Link from '@/components/navigation/PublicLink'
import type { JSX } from 'react'

import { BLOCK_TYPE } from './blockType'

/**
 * The meta description on a secondary card (side stacks, thumbnail rows).
 *
 * Every article card carries its dek, so a reader can tell two "Best X in
 * Lima" cards apart without opening them. Secondary cards clamp it to two
 * lines so a long description cannot push the column out of line with its
 * neighbours. A card whose article has no description renders nothing: the
 * "Meta description not set" placeholder belongs on lead cards, where the
 * editor will see it, not on every small card.
 */
export function CardDek({
  excerpt,
  href,
  lines = 2,
  className = '',
}: {
  excerpt: string | null | undefined
  href?: string | null
  lines?: 2 | 3
  className?: string
}): JSX.Element | null {
  const text = excerpt?.trim()
  if (!text) return null

  return (
    <p
      data-article-dek
      className={`overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] ${
        lines === 3 ? '[-webkit-line-clamp:3]' : '[-webkit-line-clamp:2]'
      } ${BLOCK_TYPE.dek} ${className}`}
    >
      {href ? <Link href={href}>{text}</Link> : text}
    </p>
  )
}
