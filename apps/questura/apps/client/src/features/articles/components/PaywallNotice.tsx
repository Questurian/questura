import Link from '@/components/navigation/PublicLink'

import { PAYWALL_CLASS, describeLock, type GateState } from '@/features/articles/lib/gate'

type PaywallNoticeProps = {
  gate: GateState
  /** Path the reader is on, so checkout can return them to it. */
  returnTo: string
  /**
   * Off when the page lays `PaywallFade` over its own prose instead. The
   * notice's fade reaches a fixed distance upward, which is wrong wherever
   * something other than prose can sit inside that distance.
   */
  fade?: boolean
}

/**
 * Dissolves the tail of the sample into the page ground. Positioned by the
 * caller; the solid end is the bottom edge.
 */
export function PaywallFade({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 z-10 ${className}`}
      style={{
        background: 'linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--background) 45%, transparent) 35%, color-mix(in srgb, var(--background) 85%, transparent) 70%, var(--background) 100%)',
      }}
    />
  )
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
export function PaywallNotice({ gate, returnTo, fade = true }: PaywallNoticeProps) {
  const { cta } = describeLock(gate)
  const isItinerary = gate.unit === 'days'
  const href = `/join?returnTo=${encodeURIComponent(returnTo)}`

  return (
    <aside
      data-paywalled
      aria-label="Members-only content"
      className={`${PAYWALL_CLASS} relative bg-background pb-2 text-center`}
    >
      {/* The notice has no top padding of its own, so the solid end of the
          fade meets the label rule and the reader sees the content stop here,
          not a gap. */}
      {fade ? <PaywallFade className="-top-56 h-56 sm:-top-72 sm:h-72" /> : null}

      <div className="flex items-center gap-4 text-accent">
        <span aria-hidden="true" className="h-px flex-1 bg-accent/40" />
        <span className="font-[family-name:var(--font-dm-sans)] text-[11px] font-semibold uppercase tracking-[0.16em]">
          Keep reading
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-accent/40" />
      </div>

      <h2 className="mx-auto mt-6 max-w-[22ch] text-balance font-display text-[30px] font-medium leading-[1.12] tracking-[-0.025em] sm:mt-7 sm:text-[38px]">
        Everything you need to travel better.
      </h2>

      <p className="mx-auto mt-3 max-w-[38ch] text-pretty font-display text-[16px] leading-[1.6] text-foreground/80 sm:mt-4 sm:text-[17px]">
        {isItinerary
          ? 'Stop piecing your trip together. Unlock the full route, the places worth your time, and the details you need before you go.'
          : 'Stop piecing your trip together. Unlock the full guide, the places worth your time, and the details you need before you go.'}
      </p>

      <Link
        href={href}
        className="mt-6 inline-flex min-h-[52px] w-full max-w-[22rem] items-center justify-center rounded-sm bg-accent px-8 py-3.5 font-[family-name:var(--font-dm-sans)] text-[15px] font-semibold tracking-[0.01em] text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:mt-7"
      >
        {cta}
      </Link>

      <p className="mt-4 font-[family-name:var(--font-dm-sans)] text-[13px] leading-relaxed text-foreground/80">
        Already a member?{' '}
        <Link href={href} className="font-semibold text-accent underline underline-offset-4 hover:text-foreground">
          Sign in
        </Link>
      </p>
    </aside>
  )
}
