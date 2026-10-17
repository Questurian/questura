'use client'

import { chooseAdConsent, resetAdConsent, useAdConsent } from './useAdConsent'

const sansClass = 'font-[family-name:var(--font-dm-sans)]'

const LABEL = {
  pending: 'Checking…',
  ask: 'Not chosen yet: no ads load until you choose.',
  granted: 'You allow ads.',
  denied: 'You said no: no ads load.',
  'not-required': 'Ads load where you are; you can turn them off.',
} as const

/** The privacy page's way to change the ad answer, as easy as giving it. */
export function AdChoice() {
  const consent = useAdConsent()

  return (
    <div className={`${sansClass} mt-3 flex flex-wrap items-center gap-3 text-[0.9rem]`}>
      <span className="text-foreground/80">{LABEL[consent]}</span>
      {consent !== 'granted' && consent !== 'not-required' && consent !== 'pending' ? (
        <button
          type="button"
          onClick={() => chooseAdConsent('granted')}
          className="border border-accent px-3 py-1.5 font-semibold text-accent transition-colors hover:bg-accent hover:text-background"
        >
          Allow ads
        </button>
      ) : null}
      {consent !== 'denied' && consent !== 'pending' ? (
        <button
          type="button"
          onClick={() => chooseAdConsent('denied')}
          className="border border-foreground/25 px-3 py-1.5 font-semibold text-foreground transition-colors hover:border-foreground/50"
        >
          No ads
        </button>
      ) : null}
      {consent === 'granted' || consent === 'denied' ? (
        <button type="button" onClick={resetAdConsent} className="text-accent underline underline-offset-2">
          Ask me again
        </button>
      ) : null}
    </div>
  )
}
