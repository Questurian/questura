'use client'

import Link from '@/components/navigation/PublicLink'

import { chooseAdConsent, useAdConsent } from './useAdConsent'

const sansClass = 'font-[family-name:var(--font-dm-sans)]'

/**
 * The question EU/EEA/UK/Swiss visitors get before any ad loads
 * (`lib/adConsent.ts`). A bar along the bottom, not a wall: the page reads
 * fine behind it, and nothing is pre-chosen. Both answers are one tap, and
 * the privacy page lets either be changed later.
 */
export function AdConsentBanner() {
  const consent = useAdConsent()
  if (consent !== 'ask') return null

  return (
    <div
      role="region"
      aria-label="Ad cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-foreground/15 bg-paper px-4 py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] 640:px-6"
    >
      <div className="mx-auto flex max-w-[1100px] flex-col gap-3 768:flex-row 768:items-center 768:gap-6">
        <p className={`${sansClass} text-[0.88rem] leading-[1.5] text-foreground/85 768:flex-1`}>
          Ads help pay for Questurian. Our ad partner, Adsterra, may use cookies to choose and
          count the ads you see. No ads load until you choose.{' '}
          <Link href="/privacy" className="text-accent underline underline-offset-2">
            Privacy
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => chooseAdConsent('granted')}
            className={`${sansClass} h-[40px] bg-accent px-5 text-[0.85rem] font-semibold text-background transition-colors hover:bg-foreground`}
          >
            Allow ads
          </button>
          <button
            type="button"
            onClick={() => chooseAdConsent('denied')}
            className={`${sansClass} h-[40px] border border-foreground/25 px-5 text-[0.85rem] font-semibold text-foreground transition-colors hover:border-foreground/50`}
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  )
}
