import type { JSX } from 'react'

import { BlockSection } from '@/features/CityDashboard/components/blocks/BlockSection'
import { EditorialLabelRule } from '@/features/articles/components/EditorialRule'
import { NewsletterCard, type NewsletterListing } from './NewsletterCard'

/**
 * Every newsletter, grouped by topic. One today; a second is one more entry
 * (and one more list on the server), and the grid takes it.
 */
const NEWSLETTER_GROUPS: { topic: string; newsletters: NewsletterListing[] }[] = [
  {
    topic: 'Travel',
    newsletters: [
      {
        name: 'The Questurian Newsletter',
        frequency: 'Monthly',
        description:
          'Our newest guides, food maps and itineraries for Latin America, with a short note from the team.',
        image: '/images/newsletter/lima-pier-greyscale.webp',
        source: 'newsletters-page',
      },
    ],
  },
]

/** The /newsletters page under its masthead: a catalogue of newsletters, each with its own Sign up. */
export function NewslettersPageSignup(): JSX.Element {
  return (
    <BlockSection contentClassName="pb-16 768:pb-24">
      <div className="border-t border-foreground/18 pt-8 768:pt-10">
        <p className="max-w-[40rem] font-[family-name:var(--font-editorial-serif)] text-[1.15rem] leading-[1.45] text-foreground/80 768:text-[1.25rem]">
          The best of Questurian, in your inbox. Every newsletter is free, and every email has a
          one-click unsubscribe.
        </p>

        {NEWSLETTER_GROUPS.map((group) => (
          <section key={group.topic} aria-label={group.topic} className="mt-10 768:mt-12">
            <EditorialLabelRule>{group.topic}</EditorialLabelRule>
            <div className="mt-6 grid gap-6 768:grid-cols-2 1024:grid-cols-3 1024:gap-8">
              {group.newsletters.map((newsletter) => (
                <NewsletterCard key={newsletter.name} newsletter={newsletter} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </BlockSection>
  )
}
