import type { ElementType, JSX, ReactNode } from 'react'
import { editorialKickerClass } from './EditorialRule'

/**
 * The box the article's editorial blocks are built from (owner, 2026-10-27).
 *
 * Key takeaways, In the know and FAQ used to
 * open with a label on a hairline running out to the column edge and close
 * with another rule; the owner read that as rules for the sake of rules. Each
 * is now one square-cornered paper box with its copy inset, opened by the
 * site's sans kicker. Same edges, type and restraint as the rest of the page:
 * no rounding, no icons, and blue only where the page already uses it (the
 * kicker, links, the diamond tick).
 */

export type EditorialBoxTone = 'paper' | 'warm'

const TONE_CLASS: Record<EditorialBoxTone, string> = {
  paper: 'bg-paper',
  warm: 'bg-background-warm',
}

/** Inner padding shared by every box, so their copy sits on one inset. */
export const editorialBoxPaddingClass = 'px-5 py-6 480:px-6 sm:px-8 sm:py-7'

/** Copy inside a box: the column's reading size. */
export const editorialBoxCopyClass =
  'font-display text-[17px] leading-[1.7] sm:text-[18px] sm:leading-[1.75]'

export function EditorialBoxLabel({ children, className = '' }: { children: ReactNode; className?: string }): JSX.Element {
  return <p className={`text-accent ${editorialKickerClass} ${className}`}>{children}</p>
}

export function EditorialBox({
  as: Tag = 'aside',
  tone = 'paper',
  label,
  children,
  className = '',
}: {
  as?: ElementType
  tone?: EditorialBoxTone
  label?: ReactNode
  children: ReactNode
  className?: string
}): JSX.Element {
  return (
    <Tag className={`text-foreground ${TONE_CLASS[tone]} ${editorialBoxPaddingClass} ${className}`}>
      {label ? <EditorialBoxLabel className="mb-4 sm:mb-5">{label}</EditorialBoxLabel> : null}
      {children}
    </Tag>
  )
}
