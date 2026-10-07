import Link from '@/components/navigation/PublicLink'

import { EditorialTick } from '@/features/articles/components/EditorialRule'
import { PAYWALL_CLASS, describeLock, type GateState } from '@/features/articles/lib/gate'

type PaywallNoticeProps = {
  gate: GateState
  /** Path the reader is on, so checkout can return them to it. */
  returnTo: string
}

/**
 * Stands in for the withheld body of a Gated item.
 *
 * Carries the `PAYWALL_CLASS` class, which is what the page's paywall JSON-LD
 * points at with `cssSelector` (Google wants a class selector), and
 * `data-paywalled`, which is how `scripts/check-structured-data.mjs` knows the
 * page is paid. Removing either silently breaks the structured data or its
 * check, so they live and change together (ADR-0009).
 *
 * Server-rendered inside the cached public shell, so it must not depend on who
 * is reading. A member sees this too, until the client swaps the full body in.
 */
export function PaywallNotice({ gate, returnTo }: PaywallNoticeProps) {
  const { cta } = describeLock(gate)
  const isItinerary = gate.unit === 'days'
  const benefits = isItinerary
    ? ['The complete day-by-day route', 'Places to eat and stops worth making', 'Every Questurian guide and itinerary']
    : ['Every section of this guide', 'Places and details worth knowing', 'Every Questurian guide and itinerary']
  const href = `/join?returnTo=${encodeURIComponent(returnTo)}`

  return (
    <aside
      data-paywalled
      aria-label="Members-only content"
      className={`${PAYWALL_CLASS} relative bg-background px-2 pb-4 pt-12 text-center sm:px-4 sm:pb-6 sm:pt-16`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-72 z-10 h-72 sm:-top-96 sm:h-96"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--background) 25%, transparent) 20%, color-mix(in srgb, var(--background) 75%, transparent) 55%, var(--background) 88%)',
        }}
      />

      <div className="mx-auto flex max-w-[28rem] items-center gap-4 text-accent">
        <span aria-hidden="true" className="h-px flex-1 bg-accent/30" />
        <span className="font-[family-name:var(--font-dm-sans)] text-[10px] font-semibold uppercase tracking-[0.16em]">
          Keep reading
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-accent/30" />
      </div>

      <h2 className="mx-auto mt-7 max-w-[22ch] text-balance font-display text-[30px] font-medium leading-[1.15] tracking-[-0.025em] sm:text-[36px]">
        Everything you need to travel better.
      </h2>

      <p className="mx-auto mt-5 max-w-[36ch] text-pretty font-display text-[16px] leading-[1.65] text-foreground sm:text-[18px]">
        {isItinerary
          ? 'Stop piecing your trip together. Unlock the full route, the places worth your time, and the details you need before you go.'
          : 'Stop piecing your trip together. Unlock the full guide, the places worth your time, and the details you need before you go.'}
      </p>

      <ul className="mx-auto mt-7 max-w-[30rem] space-y-3 text-left">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-3 font-display text-[14px] leading-relaxed text-foreground sm:text-[15px]">
            <EditorialTick className="mt-[0.6em] shrink-0 text-accent" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      <div aria-hidden="true" className="mx-auto mt-6 flex max-w-40 items-center gap-3 text-accent">
        <span className="h-px flex-1 bg-accent/30" />
        <EditorialTick className="mt-0!" />
        <span className="h-px flex-1 bg-accent/30" />
      </div>

      <Link
        href={href}
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-sm bg-accent px-7 py-3.5 font-[family-name:var(--font-dm-sans)] text-[12px] font-semibold tracking-[0.04em] text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        {cta}
      </Link>

      <p className="mx-auto mt-4 max-w-[34ch] font-display text-[13px] leading-relaxed text-foreground">
        One membership opens the whole collection.
      </p>

      <p className="mt-6 font-[family-name:var(--font-dm-sans)] text-[12px] leading-relaxed text-foreground">
        Already a member?{' '}
        <Link href={href} className="font-semibold text-accent underline underline-offset-4 hover:text-foreground">
          Sign in
        </Link>
      </p>
    </aside>
  )
}
