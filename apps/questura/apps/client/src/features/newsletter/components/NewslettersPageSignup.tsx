import type { JSX } from 'react'

import { BlockSection } from '@/features/CityDashboard/components/blocks/BlockSection'
import { EditorialLabelRule, EditorialTick } from '@/features/articles/components/EditorialRule'
import { NewsletterSignupForm } from './NewsletterSignupForm'

const WHAT_ARRIVES = [
  'The guides, food maps and itineraries we published that month, in one place.',
  'A short note from the team: what we found, where we went, what is next.',
  'Nothing else. No daily emails, no sales pitches, and one click to leave.',
]

/** The /newsletters page under its masthead: what the reader gets, and the form. */
export function NewslettersPageSignup(): JSX.Element {
  return (
    <BlockSection contentClassName="pb-16 768:pb-24">
      <div className="grid gap-10 border-t border-foreground/18 pt-8 768:pt-10 1024:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] 1024:gap-16">
        <div>
          <p className="mb-8 max-w-[36rem] font-[family-name:var(--font-editorial-serif)] text-[1.2rem] leading-[1.45] text-foreground/80 768:text-[1.3rem]">
            Once a month, our newest guides, maps and itineraries in your inbox, with a short note
            from the team.
          </p>
          <EditorialLabelRule>What arrives</EditorialLabelRule>
          <ul className="mt-6 space-y-4">
            {WHAT_ARRIVES.map((line) => (
              <li key={line} className="flex gap-3 text-accent">
                <EditorialTick />
                <span className="font-[family-name:var(--font-editorial-serif)] text-[1.08rem] leading-[1.5] text-foreground/85 768:text-[1.15rem]">
                  {line}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-paper px-5 py-7 480:px-7 768:px-8 768:py-9">
          <h2 className="font-display text-[1.6rem] font-medium leading-[1.1] tracking-[-0.02em] text-foreground 768:text-[1.9rem]">
            Get the next issue
          </h2>
          <div className="mt-5">
            <NewsletterSignupForm source="newsletters-page" tone="light" />
          </div>
        </div>
      </div>
    </BlockSection>
  )
}
