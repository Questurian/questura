import type { JSX } from 'react'

import { EditorialLabelRule } from '@/features/articles/components/EditorialRule'
import { NewsletterSignupForm } from './NewsletterSignupForm'

/**
 * The newsletter ask at the end of an article, where a reader who liked the
 * piece already stops. It interrupts typographically like every other
 * mid-column block (a label on a rule), not as a framed card.
 */
export function NewsletterArticleBand({ className = '' }: { className?: string }): JSX.Element {
  return (
    <aside aria-labelledby="newsletter-band-heading" className={className}>
      <EditorialLabelRule>The Questurian newsletter</EditorialLabelRule>
      <h2
        id="newsletter-band-heading"
        className="mt-5 font-display text-[22px] font-medium leading-[1.15] tracking-[-0.02em] text-foreground sm:text-[26px]"
      >
        Our newest guides, once a month.
      </h2>
      <p className="mt-2 max-w-[34rem] font-[family-name:var(--font-editorial-serif)] text-[1.02rem] leading-[1.5] text-foreground/75">
        New guides, maps and itineraries, with a short note from the team. Free.
      </p>
      <div className="mt-5">
        <NewsletterSignupForm source="article-end" tone="light" />
      </div>
    </aside>
  )
}
